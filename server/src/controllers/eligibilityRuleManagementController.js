import asyncHandler from '../utils/asyncHandler.js'
import {
  createEligibilityRule,
  deleteEligibilityRule,
  getEligibilityRule,
  getEligibilityRuleOptions,
  listEligibilityRules,
  updateEligibilityRule,
} from '../services/eligibilityRuleManagementService.js'

export const getEligibilityRules = asyncHandler(async (request, response) => {
  response.json({ status: 'success', data: await listEligibilityRules(request.validated.query) })
})
export const getEligibilityRuleRecord = asyncHandler(async (request, response) => {
  response.json({ status: 'success', data: { rule: await getEligibilityRule(request.validated.params.ruleId) } })
})
export const getEligibilityRuleOptionRecords = asyncHandler(async (request, response) => {
  response.json({ status: 'success', data: await getEligibilityRuleOptions(request.validated.query) })
})
export const postEligibilityRule = asyncHandler(async (request, response) => {
  response.status(201).json({ status: 'success', data: { rule: await createEligibilityRule(request.validated.body) } })
})
export const putEligibilityRule = asyncHandler(async (request, response) => {
  response.json({ status: 'success', data: { rule: await updateEligibilityRule(request.validated.params.ruleId, request.validated.body) } })
})
export const removeEligibilityRule = asyncHandler(async (request, response) => {
  response.json({ status: 'success', data: await deleteEligibilityRule(request.validated.params.ruleId) })
})
