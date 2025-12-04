const PrintRequest = require('../models/PrintRequest')
const User = require('../models/User')

// Helper function to extract original filename from formatted filename
function extractOriginalFilename(formattedName) {
  const match = formattedName.match(/^(.+?)_\d{2}-\d{2}-\d{4}(\.[^.]+)$/)
  if (match) {
    return match[1] + match[2] // name + extension
  }
  return formattedName // return as-is if doesn't match pattern
}

const getAllRequests = async (req, res) => {
  try {
    const requests = await PrintRequest.find().sort({ createdAt: 1 })
    res.json(requests)
  } catch (err) {
    console.error('Error fetching print requests:', err)
    res.status(500).json({ error: 'Failed to fetch print requests', details: err.message })
  }
}

const getRequestById = async (req, res) => {
  try {
    const request = await PrintRequest.findById(req.params.id)
    if (!request) return res.status(404).json({ error: 'Print request not found' })
    res.json(request)
  } catch (err) {
    console.error('Error fetching print request:', err)
    res.status(500).json({ error: 'Failed to fetch print request', details: err.message })
  }
}

const updateRequest = async (req, res) => {
  try {
    const currentRequest = await PrintRequest.findById(req.params.id)
    if (!currentRequest) return res.status(404).json({ error: 'Print request not found' })

    const nonStatusFields = Object.keys(req.body).filter((key) => key !== 'status')
    if (nonStatusFields.length > 0 && currentRequest.status !== 'Pending') {
      return res.status(400).json({ error: 'Only pending requests can be revised. This request is no longer editable.', currentStatus: currentRequest.status })
    }

    const allowedFields = ['status', 'pickupDateTime', 'semester', 'academicYear']
    const updates = {}
    for (const field of allowedFields) if (req.body[field] !== undefined) updates[field] = req.body[field]

    if (updates.status) {
      const validStatuses = ['Pending', 'Accepted', 'Completed', 'Rejected', 'Cancelled']
      if (!validStatuses.includes(updates.status)) return res.status(400).json({ error: 'Invalid status', validStatuses })
    }

    if (updates.semester) {
      const allowedSemesters = ['1st Semester', '2nd Semester', 'Short Term']
      if (!allowedSemesters.includes(updates.semester)) {
        return res.status(400).json({ error: 'Invalid semester', allowedSemesters })
      }
    }

    if (updates.academicYear) {
      const ay = String(updates.academicYear).trim()
      const matchYYYY = ay.match(/^(\d{4}-\d{4})$/)
      const matchAY = ay.match(/^AY\s?(\d{4}-\d{4})$/i)
      if (!matchYYYY && !matchAY) {
        return res.status(400).json({ error: 'Invalid academicYear format. Use "AY YYYY-YYYY" or "YYYY-YYYY".' })
      }
      // normalize to "AY YYYY-YYYY"
      const range = matchYYYY ? matchYYYY[1] : matchAY[1]
      updates.academicYear = `AY ${range}`
    }

    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' })

    const updatedRequest = await PrintRequest.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })

    // If status changed, add a notification to the user
    if (updates.status && currentRequest.userId) {
      try {
        const notifType = 'print_request_status'
        const fileNames = updatedRequest.documents.map(d => d.documentTitle).join(', ')
        let message = `Your print request for "${fileNames}" status changed to ${updates.status}.`
        if (updates.status === 'Accepted') message = `Your print request for "${fileNames}" has been accepted and is being processed.`
        if (updates.status === 'Completed' || updates.status === 'Ready') message = `Your print request for "${fileNames}" is ready for pickup.`
        if (updates.status === 'Rejected') message = `Your print request for "${fileNames}" was rejected.`
        if (updates.status === 'Cancelled') message = `Your print request for "${fileNames}" was cancelled due to unclaimed pickup.`

        const notification = { type: notifType, message, requestId: updatedRequest._id }
        await User.findByIdAndUpdate(currentRequest.userId, { $push: { notifications: notification } })
        
        // Emit real-time notification via Socket.IO if available
        if (global.io) {
          global.io.emit(`notification:${currentRequest.userId}`, notification)
        }
      } catch (notifErr) {
        console.error('Failed to add notification after status update:', notifErr)
      }
    }

    res.json(updatedRequest)
  } catch (err) {
    console.error('Error updating print request:', err)
    res.status(500).json({ error: 'Failed to update print request', details: err.message })
  }
}

const deleteRequest = async (req, res) => {
  try {
    const request = await PrintRequest.findById(req.params.id)
    if (!request) return res.status(404).json({ error: 'Request not found' })

    const totalTokens = Number(request.totalTokens || 0)
    const userId = request.userId

    
    let refunded = false
    let refundedAmount = 0
    let newBalance = null

    if (totalTokens > 0 && userId) {
      try {
        const user = await User.findById(userId)
        if (user) {
          // Only refund if the request is still pending 
          if ((request.status || '').toLowerCase() === 'pending') {
            user.tokenBalance = (Number(user.tokenBalance || 0) + totalTokens)
            await user.save()
            refunded = true
            refundedAmount = totalTokens
            newBalance = user.tokenBalance
          }
        } else {
          // user not found 
          console.warn(`User for request ${req.params.id} not found; skipping refund.`)
        }
      } catch (userErr) {
        console.error('Error while refunding tokens to user:', userErr)
        // proceed with deletion but include refund error in response
      }
    }

    // Delete the request after attempting refund
    await PrintRequest.findByIdAndDelete(req.params.id)

    // Notify user that request was cancelled/deleted
    try {
      if (userId) {
        const fileNames = request.documents.map(d => d.documentTitle).join(', ')
        const message = `Your print request for "${fileNames}" was cancelled.`
        const notification = { type: 'print_request_cancelled', message, requestId: request._id }
        await User.findByIdAndUpdate(userId, { $push: { notifications: notification } })
        
        // Emit real-time notification via Socket.IO if available
        if (global.io) {
          global.io.emit(`notification:${userId}`, notification)
        }
      }
    } catch (notifErr) {
      console.error('Failed to add cancellation notification:', notifErr)
    }

    const resp = { message: 'Request deleted successfully', refunded, refundedAmount }
    if (refunded) resp.newBalance = newBalance
    else if (totalTokens > 0) resp.note = 'No refund performed (request not pending or user missing).'

    res.json(resp)
  } catch (err) {
    console.error('Error deleting request:', err)
    res.status(500).json({ error: 'Failed to delete request', details: err.message })
  }
}

const submitRequest = async (req, res) => {
  try {
    // normalize printJobs
    let printJobs = []
    if (typeof req.body.printJobs === 'string' && req.body.printJobs.trim() !== '') {
      try {
        printJobs = JSON.parse(req.body.printJobs)
        if (!Array.isArray(printJobs)) printJobs = Array.isArray(printJobs.jobs) ? printJobs.jobs : [printJobs]
      } catch (parseErr) {
        return res.status(400).json({ error: 'Invalid printJobs JSON' })
      }
    } else if (Array.isArray(req.body.printJobs)) printJobs = req.body.printJobs

    const files = Array.isArray(req.files) ? req.files : []
    const documents = []
    let totalTokensRequest = 0

    req.body.jobs.forEach((job, index) => {
      const file = req.files && req.files[index]

      const tokensPerPage = calculateTokensPerPage(job.paperType, job.paperSide)
      const totalTokens = tokensPerPage * (job.pageCount || 1) * (job.copies || 1)
      totalTokensRequest += totalTokens

      documents.push({
        documentTitle: file ? extractOriginalFilename(file.originalname) : (job.documentTitle ? extractOriginalFilename(job.documentTitle) : 'Untitled'),
        filePath: file ? '/uploads/' + file.filename : null,
        numberOfCopies: Number.parseInt(job.copies ?? '1', 10) || 1,
        paperSize: job.paperSize || '',
        printingSide: job.paperSide || job.paper_side || '',
        printType: job.paperType || job.paper_type || '',
        notes: job.notes || '', // Ensure notes are fetched from the request body
        pageCount: Number.parseInt(job.pageCount ?? '1', 10) || 1,
        tokensPerPage,
        totalTokens,
        isImagePrint,
      })
    })

    const fullName = req.body.full_name || req.body.fullName || req.body.fullname || req.body.name || ''
    const courseYear = req.body.course_year || req.body.courseYear || req.body.year || ''
    const email = req.body.email || req.body.user_email
    if (!email) return res.status(400).json({ error: 'Email is required' })

    let semester = (req.body.semester || req.body.semesterSelect || req.body.semesterInput || '').trim()
    let academicYearRaw = (req.body.academic_year || req.body.academicYear || req.body.academicYearInput || '').trim()

    const allowedSemesters = ['1st Semester', '2nd Semester', 'Short Term']
    if (semester) {
      if (!allowedSemesters.includes(semester)) {
        return res.status(400).json({ error: 'Invalid semester. Allowed: 1st Semester, 2nd Semester, Short Term' })
      }
    } else {
      semester = undefined
    }

    // normalize academic year if provided
    let academicYear = undefined
    if (academicYearRaw) {
      const matchYYYY = academicYearRaw.match(/^(\d{4}-\d{4})$/)
      const matchAY = academicYearRaw.match(/^AY\s?(\d{4}-\d{4})$/i)
      if (matchYYYY) academicYear = `AY ${matchYYYY[1]}`
      else if (matchAY) academicYear = `AY ${matchAY[1]}`
      else {
        return res.status(400).json({ error: 'Invalid academicYear format. Use "AY YYYY-YYYY" or "YYYY-YYYY".' })
      }
    }

    const user = await User.findOne({ email })
    if (!user) return res.status(404).json({ error: 'User not found' })

    if (user.tokenBalance < totalTokensRequest) {
      return res.status(400).json({
        error: 'Insufficient tokens',
        currentBalance: user.tokenBalance,
        required: totalTokensRequest,
      })
    }

    // Parse pickup date into a date-only value
    const pickupDateStr = (req.body.pickup_datetime || req.body.pickupDateTime || '').toString()
    const pickupDateMatch = pickupDateStr.match(/^(\d{4}-\d{2}-\d{2})/)
    const pickupDateOnly = pickupDateMatch ? pickupDateMatch[1] : ''
    const pickupDate = pickupDateOnly ? new Date(pickupDateOnly + 'T00:00:00') : null

    // If pickup date is provided and is a future date (strictly after today), enforce max 20 pending
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let isToday = false
    if (pickupDate) {
      const pd = new Date(pickupDate)
      pd.setHours(0, 0, 0, 0)
      isToday = pd.toDateString() === today.toDateString()
      const isFuture = pd > today
      if (isFuture) {
        const startOfDay = new Date(pd)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(pd)
        endOfDay.setHours(23, 59, 59, 999)
        const countOnDate = await PrintRequest.countDocuments({ pickupDateTime: { $gte: startOfDay, $lte: endOfDay }, status: 'Pending' })
        if (countOnDate >= 20) {
          return res.status(400).json({ error: 'Reservation limit reached for this date. Maximum 20 reservations allowed per day. Please choose another date.' })
        }
      }
    }

    const newRequestData = {
      fullName,
      courseYear,
      email,
      userId: user._id,
      pickupDateTime: pickupDate ? pickupDate : (req.body.pickup_datetime || req.body.pickupDateTime || ''),
      documents,
      totalTokens: totalTokensRequest,
      status: 'Pending',
    }

    // Save the request to the database
    const newRequest = new PrintRequest(newRequestData)
    await newRequest.save()

    // Calculate queue position (how many pending were created before this on same date)
    let queuePosition = null
    if (pickupDate) {
      const startOfDay = new Date(pickupDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(pickupDate)
      endOfDay.setHours(23, 59, 59, 999)
      const beforeCount = await PrintRequest.countDocuments({ pickupDateTime: { $gte: startOfDay, $lte: endOfDay }, status: 'Pending', _id: { $lt: newRequest._id } })
      queuePosition = beforeCount + 1
    }

    res.status(201).json({ message: 'Request submitted successfully', requestId: newRequest._id, queuePosition, isToday })
  } catch (err) {
    console.error('Error submitting print request:', err)
    res.status(500).json({ error: 'Failed to submit print request', details: err.message })
  }
}

module.exports = {
  getAllRequests,
  getRequestById,
  updateRequest,
  deleteRequest,
  submitRequest,
}

// GET /requests/queue/count?date=YYYY-MM-DD
async function getQueueCountByDate(req, res) {
  try {
    const dateStr = req.query.date
    if (!dateStr) return res.status(400).json({ error: 'Missing date query parameter' })
    const match = String(dateStr).match(/^(\d{4}-\d{2}-\d{2})/)
    if (!match) return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' })
    const dateOnly = match[1]
    const d = new Date(dateOnly + 'T00:00:00')
    if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid date value' })
    const startOfDay = new Date(d)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(d)
    endOfDay.setHours(23, 59, 59, 999)

    const count = await PrintRequest.countDocuments({ pickupDateTime: { $gte: startOfDay, $lte: endOfDay }, status: 'Pending' })
    return res.json({ date: dateOnly, count })
  } catch (err) {
    console.error('getQueueCountByDate error:', err)
    return res.status(500).json({ error: 'Failed to get queue count', details: err.message })
  }
}

module.exports.getQueueCountByDate = getQueueCountByDate
