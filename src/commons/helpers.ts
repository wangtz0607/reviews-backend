import { ErrorResponse } from '../routes/AbstractRoute';
import Database from '../database/Database';
import Transaction from '../database/Transaction';
import RateLimiter from '../rate-limiting/RateLimiter';
import {
  validateUsername,
  validateEmail,
  validatePassword,
  validateName,
  validateGravatarEmail,
  validateYear,
  validateSemester,
  validateRating,
  validateReview,
  validateComment,
  validateVote
} from './validation';
import {
  classExists,
  commentExists,
  commentVoteExists,
  courseExists,
  departmentExists,
  reviewExists,
  staffExists,
  userExists
} from './query';
import { parseIntExact } from './miscellaneous';

export async function applyHandler(handler: (request: Record<string, any>, response: Record<string, any>) => Promise<void>, request: Record<string, any>, response: Record<string, any>, next: (...args: any) => any): Promise<void> {
  try {
    await handler(request, response);
  } catch (e) {
    if (e instanceof ErrorResponse) {
      response.status(e.statusCode).json({ message: e.message });
      return;
    }
    next(e);
  }
}

export function ensureUsernameValid(username: string): void {
  const message = validateUsername(username);
  if (message !== 'ok') {
    throw new ErrorResponse(422, message);
  }
}

export function ensureEmailValid(email: string): void {
  const message = validateEmail(email);
  if (message !== 'ok') {
    throw new ErrorResponse(422, message);
  }
}

export function ensurePasswordValid(password: string): void {
  const message = validatePassword(password);
  if (message !== 'ok') {
    throw new ErrorResponse(422, message);
  }
}

export function ensureNameValid(name: string): void {
  const message = validateName(name);
  if (message !== 'ok') {
    throw new ErrorResponse(422, message);
  }
}

export function ensureGravatarEmailValid(gravatarEmail: string): void {
  const message = validateGravatarEmail(gravatarEmail);
  if (message !== 'ok') {
    throw new ErrorResponse(422, message);
  }
}

export function ensureYearValid(year: number): void {
  const message = validateYear(year);
  if (message !== 'ok') {
    throw new ErrorResponse(422, message);
  }
}

export function ensureSemesterValid(semester: string): void {
  const message = validateSemester(semester);
  if (message !== 'ok') {
    throw new ErrorResponse(422, message);
  }
}

export function ensureRatingValid(rating: number): void {
  const message = validateRating(rating);
  if (message !== 'ok') {
    throw new ErrorResponse(422, message);
  }
}

export function ensureReviewValid(review: string): void {
  const message = validateReview(review);
  if (message !== 'ok') {
    throw new ErrorResponse(422, message);
  }
}

export function ensureCommentValid(comment: string): void {
  const message = validateComment(comment);
  if (message !== 'ok') {
    throw new ErrorResponse(422, message);
  }
}

export function ensureVoteValid(vote: string): void {
  const message = validateVote(vote);
  if (message !== 'ok') {
    throw new ErrorResponse(422, message);
  }
}

export function ensureLoggedIn(session: any): void {
  if (session?.myUserId === undefined) {
    throw new ErrorResponse(401, 'Not logged in');
  }
}

export function getLimitOffset(query: Record<string, string>): { limit: number, offset: number } {
  const limit = parseIntExact(query.limit);
  if (isNaN(limit)) {
    throw new ErrorResponse(400, 'Invalid limit');
  }
  if (limit < 0) {
    throw new ErrorResponse(422, 'limit cannot be negative');
  }
  if (limit > 50) {
    throw new ErrorResponse(422, 'limit cannot be greater than 50');
  }
  const offset = parseIntExact(query.offset);
  if (isNaN(offset)) {
    throw new ErrorResponse(400, 'Invalid offset');
  }
  if (offset < 0) {
    throw new ErrorResponse(422, 'offset cannot be negative');
  }
  return { limit, offset };
}

export function getClassId(params: Record<string, string>): number {
  const classId = parseIntExact(params.classId);
  if (isNaN(classId)) {
    throw new ErrorResponse(404, 'Invalid class ID');
  }
  return classId;
}

export function getCommentId(params: Record<string, string>): number {
  const commentId = parseIntExact(params.commentId);
  if (isNaN(commentId)) {
    throw new ErrorResponse(404, 'Invalid comment ID');
  }
  return commentId;
}

export function getCourseId(params: Record<string, string>): number {
  const courseId = parseIntExact(params.courseId);
  if (isNaN(courseId)) {
    throw new ErrorResponse(404, 'Invalid course ID');
  }
  return courseId;
}

export function getDepartmentId(params: Record<string, string>): number {
  const departmentId = parseIntExact(params.departmentId);
  if (isNaN(departmentId)) {
    throw new ErrorResponse(404, 'Invalid department ID');
  }
  return departmentId;
}

export function getReviewId(params: Record<string, string>): number {
  const reviewId = parseIntExact(params.reviewId);
  if (isNaN(reviewId)) {
    throw new ErrorResponse(404, 'Invalid review ID');
  }
  return reviewId;
}

export function getStaffId(params: Record<string, string>): number {
  const staffId = parseIntExact(params.staffId);
  if (isNaN(staffId)) {
    throw new ErrorResponse(404, 'Invalid staff ID');
  }
  return staffId;
}

export function getUserId(params: Record<string, string>): number {
  const userId = parseIntExact(params.userId);
  if (isNaN(userId)) {
    throw new ErrorResponse(404, 'Invalid user ID');
  }
  return userId;
}

export async function ensureClassExists(queryable: Database | Transaction, classId: number): Promise<void> {
  if (!await classExists(queryable, classId)) {
    throw new ErrorResponse(404, 'No such class');
  }
}

export async function ensureCommentExists(queryable: Database | Transaction, commentId: number): Promise<void> {
  if (!await commentExists(queryable, commentId)) {
    throw new ErrorResponse(404, 'No such comment');
  }
}

export async function ensureCommentVoteExists(queryable: Database | Transaction, commentId: number, userId: number): Promise<void> {
  if (!await commentVoteExists(queryable, commentId, userId)) {
    throw new ErrorResponse(404, 'No such vote');
  }
}

export async function ensureCourseExists(queryable: Database | Transaction, courseId: number): Promise<void> {
  if (!await courseExists(queryable, courseId)) {
    throw new ErrorResponse(404, 'No such course');
  }
}

export async function ensureDepartmentExists(queryable: Database | Transaction, departmentId: number): Promise<void> {
  if (!await departmentExists(queryable, departmentId)) {
    throw new ErrorResponse(404, 'No such department');
  }
}

export async function ensureReviewExists(queryable: Database | Transaction, reviewId: number): Promise<void> {
  if (!await reviewExists(queryable, reviewId)) {
    throw new ErrorResponse(404, 'No such comment');
  }
}

export async function ensureStaffExists(queryable: Database | Transaction, staffId: number): Promise<void> {
  if (!await staffExists(queryable, staffId)) {
    throw new ErrorResponse(404, 'No such staff');
  }
}

export async function ensureUserExists(queryable: Database | Transaction, userId: number): Promise<void> {
  if (!await userExists(queryable, userId)) {
    throw new ErrorResponse(404, 'No such user');
  }
}

export async function ensureRateLimit(rateLimiter: RateLimiter, identifiers: string | string[], action: string): Promise<void> {
  if (!await rateLimiter.check(identifiers, action)) {
    throw new ErrorResponse(429, 'Rate limit exceeded');
  }
}
