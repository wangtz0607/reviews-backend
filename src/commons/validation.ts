export function validateUsername(username: string): string {
  if ([...username].length < 3) {
    return 'Username cannot be less than 3 characters';
  }
  if ([...username].length > 255) {
    return 'Username cannot be more than 255 characters';
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
    return 'Only letters (a-z, A-Z), digits (0-9), dots (.), underscores (_) and dashes (-) are allowed in username';
  }
  if (/^(?:root|admin|administrator|superadmin)$/i.test(username)) {
    return 'Reserved username';
  }
  return 'ok';
}

export function validateEmail(email: string): string {
  if (!/^[\w.!#$%&'*+/=?^_`{|}~-]+@[\w-]+(\.[\w-]+)*$/.test(email)) {
    return 'Invalid email address';
  }
  return 'ok';
}

export function validatePassword(password: string): string {
  if ([...password].length < 6) {
    return 'Password cannot be less than 6 characters';
  }
  if ([...password].length > 255) {
    return 'Password cannot be more than 255 characters';
  }
  return 'ok';
}

export function validateName(name: string): string {
  if ([...name].length < 3) {
    return 'Name cannot be less than 3 characters';
  }
  if ([...name].length > 255) {
    return 'Name cannot be more than 255 characters';
  }
  return 'ok';
}

export function validateGravatarEmail(gravatarEmail: string): string {
  if ([...gravatarEmail].length > 255) {
    return 'Gravatar email address cannot be more than 255 characters';
  }
  return 'ok';
}

export function validateYear(year: number): string {
  if (!Number.isInteger(year)) {
    return 'Invalid year';
  }
  return 'ok';
}

export function validateSemester(semester: string): string {
  if (!['Spring', 'Fall'].includes(semester)) {
    return 'Invalid semester';
  }
  return 'ok';
}

export function validateRating(rating: number): string {
  if (!Number.isInteger(rating) || rating < 0 || rating > 10) {
    return 'Invalid rating';
  }
  return 'ok';
}

export function validateReview(review: string): string {
  if ([...review].length < 10) {
    return 'Review cannot be less than 10 characters';
  }
  if ([...review].length > 65535) {
    return 'Review cannot be more than 65535 characters';
  }
  return 'ok';
}

export function validateComment(comment: string): string {
  if ([...comment].length < 3) {
    return 'Comment cannot be less than 3 characters';
  }
  if ([...comment].length > 65535) {
    return 'Comment cannot be more than 65535 characters';
  }
  return 'ok';
}

export function validateVote(vote: string): string {
  if (!['U', 'D'].includes(vote)) {
    return 'Invalid vote';
  }
  return 'ok';
}
