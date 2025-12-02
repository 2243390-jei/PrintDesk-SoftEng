const PrintRequest = require('../models/PrintRequest')
const User = require('../models/User')

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
      const validStatuses = ['Pending', 'Accepted', 'Completed', 'Rejected']
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

    for (let i = 0; i < printJobs.length; i++) {
      const job = printJobs[i] || {}
      let file = null
      if (files.length > 0) {
        if (job.documentTitle) file = files.find((f) => f.originalname === job.documentTitle) || files[i] || null
        else file = files[i] || null
      }

      const totalTokens = Number.parseInt(job.totalTokens ?? '0', 10) || 0
      const tokensPerPage = Number.parseInt(job.tokensPerPage ?? '0', 10) || 0
      const isImagePrint = job.isImagePrint === true || job.isImagePrint === 'true' || job.isImagePrint === '1'

      totalTokensRequest += totalTokens

      documents.push({
        documentTitle: job.documentTitle || (file ? file.originalname : 'Untitled'),
        filePath: file ? '/uploads/' + file.filename : null,
        numberOfCopies: Number.parseInt(job.copies ?? '1', 10) || 1,
        paperSize: job.paperSize || '',
        printingSide: job.paperSide || job.paper_side || '',
        printType: job.paperType || job.paper_type || '',
        notes: job.notes || '',
        pageCount: Number.parseInt(job.pageCount ?? '1', 10) || 1,
        tokensPerPage,
        totalTokens,
        isImagePrint,
      })
    }

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

    if (user.tokenBalance < totalTokensRequest) return res.status(400).json({ error: 'Insufficient tokens', currentBalance: user.tokenBalance, required: totalTokensRequest })

    const newRequestData = {
      fullName,
      courseYear,
      email,
      userId: user._id,
      pickupDateTime: req.body.pickup_datetime || req.body.pickupDateTime || '',
      documents,
      totalTokens: totalTokensRequest,
      status: 'Pending',
    }
    if (semester) newRequestData.semester = semester
    if (academicYear) newRequestData.academicYear = academicYear

    const newRequest = new PrintRequest(newRequestData)
    await newRequest.save()

    user.tokenBalance -= totalTokensRequest
    await user.save()

    res.status(200).json({ message: 'Print request submitted successfully', requestId: newRequest._id, totalTokens: totalTokensRequest, remainingTokens: user.tokenBalance, status: newRequest.status })
  } catch (err) {
    console.error('Error in submitRequest:', err)
    res.status(500).json({ error: 'Failed to submit print request', details: err.message })
  }
}

module.exports = { getAllRequests, getRequestById, updateRequest, deleteRequest, submitRequest }
