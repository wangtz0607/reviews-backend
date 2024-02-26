import Database from '../database/Database';
import Transaction from '../database/Transaction';
import { computeGravatarHash } from './miscellaneous';

export async function classExists(queryable: Database | Transaction, classId: number): Promise<boolean> {
  const [{ count }] = await queryable.query('SELECT COUNT(*) AS count FROM class WHERE id = ?', classId);
  return count > 0;
}

export async function commentExists(queryable: Database | Transaction, commentId: number): Promise<boolean> {
  const [{ count }] = await queryable.query('SELECT COUNT(*) AS count FROM comment WHERE id = ?', commentId);
  return count > 0;
}

export async function commentVoteExists(queryable: Database | Transaction, commentId: number, userId: number): Promise<boolean> {
  const [{ count }] = await queryable.query('SELECT COUNT(*) AS count FROM comment_vote WHERE user_id = ? AND comment_id = ?', [userId, commentId]);
  return count > 0;
}

export async function courseExists(queryable: Database | Transaction, courseId: number): Promise<boolean> {
  const [{ count }] = await queryable.query('SELECT COUNT(*) AS count FROM course WHERE id = ?', courseId);
  return count > 0;
}

export async function departmentExists(queryable: Database | Transaction, departmentId: number): Promise<boolean> {
  const [{ count }] = await queryable.query('SELECT COUNT(*) AS count FROM department WHERE id = ?', departmentId);
  return count > 0;
}

export async function reviewExists(queryable: Database | Transaction, reviewId: number): Promise<boolean> {
  const [{ count }] = await queryable.query('SELECT COUNT(*) AS count FROM review WHERE id = ?', reviewId);
  return count > 0;
}

export async function reviewVoteExists(queryable: Database | Transaction, reviewId: number, userId: number): Promise<boolean> {
  const [{ count }] = await queryable.query('SELECT COUNT(*) AS count FROM review_vote WHERE user_id = ? AND review_id = ?', [userId, reviewId]);
  return count > 0;
}

export async function staffExists(queryable: Database | Transaction, staffId: number): Promise<boolean> {
  const [{ count }] = await queryable.query('SELECT COUNT(*) AS count FROM staff WHERE id = ?', staffId);
  return count > 0;
}

export async function userExists(queryable: Database | Transaction, userId: number): Promise<boolean> {
  const [{ count }] = await queryable.query('SELECT COUNT(*) AS count FROM user WHERE id = ?', userId);
  return count > 0;
}

export async function queryClasses(
  queryable: Database | Transaction,
  options: {
    id?: number,
    courseId?: number,
    departmentId?: number,
    staffId?: number,
    keyword?: string,
    limit?: number,
    offset?: number,
  },
  myUserId?: number
): Promise<any[]> {
  const { id, courseId, departmentId, staffId, keyword, limit, offset } = options;
  let sql = `
SELECT
    class_view.id AS id,
    course.id AS course_id,
    course.name AS course_name,
    class_view.rating AS rating,
    class_view.num_reviews AS num_reviews,
    class_view.num_effective_reviews AS num_effective_reviews,
    review.id AS my_review_id,
    review.rating AS my_review_rating
{FROM}
{WHERE}
{ORDER_BY}
{LIMIT}
{OFFSET}`;
  const clauses = {
    FROM: 'FROM class_view JOIN course ON class_view.course_id = course.id',
    WHERE: 'WHERE TRUE',
    ORDER_BY: '',
    LIMIT: '',
    OFFSET: ''
  };
  let values = [] as any[];
  if (staffId !== undefined) {
    clauses.FROM += ' JOIN class_staff ON class_view.id = class_staff.class_id';
  }
  if (keyword !== undefined) {
    clauses.FROM += ' JOIN class_staff ON class_view.id = class_staff.class_id JOIN staff ON class_staff.staff_id = staff.id';
  }
  if (myUserId !== undefined) {
    clauses.FROM += ' LEFT JOIN review ON class_view.id = review.class_id AND review.user_id = ?';
    values.push(myUserId);
  } else {
    clauses.FROM += ' LEFT JOIN review ON FALSE';
  }
  if (id !== undefined) {
    clauses.WHERE += ' AND class_view.id = ?';
    values.push(id);
  }
  if (courseId !== undefined) {
    clauses.WHERE += ' AND course.id = ?';
    values.push(courseId);
  }
  if (departmentId !== undefined) {
    clauses.WHERE += ' AND course.department_id = ?';
    values.push(departmentId);
  }
  if (staffId !== undefined) {
    clauses.WHERE += ' AND class_staff.staff_id = ?';
    values.push(staffId);
  }
  if (keyword !== undefined) {
    clauses.WHERE += ' AND (course.name LIKE ? OR staff.name LIKE ?)';
    values.push(`%${keyword}%`, `%${keyword}%`);
  }
  clauses.ORDER_BY = 'ORDER BY class_view.id';
  if (limit !== undefined) {
    clauses.LIMIT = 'LIMIT ?';
    values.push(limit);
  }
  if (offset !== undefined) {
    clauses.OFFSET = 'OFFSET ?';
    values.push(offset);
  }
  sql = sql
    .replace('{FROM}', clauses.FROM)
    .replace('{WHERE}', clauses.WHERE)
    .replace('{ORDER_BY}', clauses.ORDER_BY)
    .replace('{LIMIT}', clauses.LIMIT)
    .replace('{OFFSET}', clauses.OFFSET);
  const classes = (await queryable.query(sql, values)).map(row => {
    const {
      id,
      courseId,
      courseName,
      numReviews,
      numEffectiveReviews,
      myReviewId,
      myReviewRating
    } = row;
    let { rating } = row;
    if (rating !== null) {
      rating = +rating;
    }
    return {
      id,
      course: {
        id: courseId,
        name: courseName
      },
      instructors: [] as any[],
      rating,
      numReviews,
      numEffectiveReviews,
      myReview: myReviewId === null ? null : {
        id: myReviewId,
        rating: myReviewRating
      }
    };
  });
  if (classes.length > 0) {
    sql = `
SELECT
    class_staff.class_id AS class_id,
    staff.id AS staff_id,
    staff.name AS staff_name
FROM class_staff
    JOIN staff ON class_staff.staff_id = staff.id
WHERE class_staff.class_id IN (?)`;
    values = [classes.map(cls => cls.id)];
    const classInstructors = new Map<number, any[]>();
    (await queryable.query(sql, values)).forEach(row => {
      const { classId, staffId, staffName } = row;
      if (!classInstructors.has(classId)) {
        classInstructors.set(classId, []);
      }
      classInstructors.get(classId)!.push({
        id: staffId,
        name: staffName
      });
    });
    for (const cls of classes) {
      cls.instructors = classInstructors.get(cls.id) ?? [];
    }
  }
  return classes;
}

export async function queryComments(
  queryable: Database | Transaction,
  options: {
    reviewId?: number,
    limit?: number,
    offset?: number
  },
  myUserId?: number
): Promise<any[]> {
  const { reviewId, limit, offset } = options;
  let sql = `
SELECT
    comment_view.id AS id,
    user.id AS user_id,
    user.username AS user_username,
    user.name AS user_name,
    user.gravatar_email AS user_gravatar_email,
    comment_view.comment AS comment,
    comment_view.time AS time,
    comment_view.upvotes AS upvotes,
    comment_view.downvotes AS downvotes,
    comment_vote.vote AS my_vote
{FROM}
{WHERE}
{ORDER_BY}
{LIMIT}
{OFFSET}`;
  const clauses = {
    FROM: 'FROM comment_view JOIN user ON comment_view.user_id = user.id',
    WHERE: 'WHERE TRUE',
    ORDER_BY: '',
    LIMIT: '',
    OFFSET: ''
  };
  const values = [] as any[];
  if (myUserId !== undefined) {
    clauses.FROM += ' LEFT JOIN comment_vote ON comment_vote.comment_id = comment_view.id AND comment_vote.user_id = ?';
    values.push(myUserId);
  } else {
    clauses.FROM += ' LEFT JOIN comment_vote ON FALSE';
  }
  if (reviewId !== undefined) {
    clauses.WHERE += ' AND comment_view.review_id = ?';
    values.push(reviewId);
  }
  clauses.ORDER_BY = 'ORDER BY comment_view.time ASC';
  if (limit !== undefined) {
    clauses.LIMIT = 'LIMIT ?';
    values.push(limit);
  }
  if (offset !== undefined) {
    clauses.OFFSET = 'OFFSET ?';
    values.push(offset);
  }
  sql = sql
    .replace('{FROM}', clauses.FROM)
    .replace('{WHERE}', clauses.WHERE)
    .replace('{ORDER_BY}', clauses.ORDER_BY)
    .replace('{LIMIT}', clauses.LIMIT)
    .replace('{OFFSET}', clauses.OFFSET);
  return (await queryable.query(sql, values)).map(row => {
    const {
      id,
      userId,
      userUsername,
      userName,
      userGravatarEmail,
      comment,
      time,
      upvotes,
      downvotes,
      myVote
    } = row;
    const userGravatarHash = computeGravatarHash(userGravatarEmail);
    return {
      id,
      user: {
        id: userId,
        username: userUsername,
        name: userName,
        gravatarHash: userGravatarHash
      },
      comment,
      time,
      upvotes,
      downvotes,
      myVote
    };
  });
}

export async function queryCourses(
  queryable: Database | Transaction,
  options: {
    id?: number,
    departmentId?: number,
    keyword?: string,
    limit?: number,
    offset?: number
  }
): Promise<any[]> {
  const { id, departmentId, keyword, limit, offset } = options;
  let sql = `
SELECT
    course_view.id AS id,
    course_view.official_id AS official_id,
    course_view.name AS name,
    department.id AS department_id,
    department.name AS department_name,
    course_view.periods AS periods,
    course_view.credits AS credits,
    course_view.audience AS audience,
    course_view.type AS type,
    course_view.num_classes AS num_classes
FROM course_view
    JOIN department ON course_view.department_id = department.id
{WHERE}
{ORDER_BY}
{LIMIT}
{OFFSET}`;
  const clauses = {
    WHERE: 'WHERE TRUE',
    ORDER_BY: '',
    LIMIT: '',
    OFFSET: ''
  };
  const values = [] as any[];
  if (id !== undefined) {
    clauses.WHERE += ' AND course_view.id = ?';
    values.push(id);
  }
  if (departmentId !== undefined) {
    clauses.WHERE += ' AND department.id = ?';
    values.push(departmentId);
  }
  clauses.ORDER_BY = 'ORDER BY course_view.id';
  if (keyword !== undefined) {
    clauses.WHERE += ' AND (course_view.official_id LIKE ? OR course_view.name LIKE ?)';
    clauses.ORDER_BY = ' ORDER BY (course_view.official_id = ? OR course_view.name = ?) DESC, course_view.id';
    values.push(`%${keyword}%`, `%${keyword}%`, keyword, keyword);
  }
  if (limit !== undefined) {
    clauses.LIMIT = 'LIMIT ?';
    values.push(limit);
  }
  if (offset !== undefined) {
    clauses.OFFSET = 'OFFSET ?';
    values.push(offset);
  }
  sql = sql
    .replace('{WHERE}', clauses.WHERE)
    .replace('{ORDER_BY}', clauses.ORDER_BY)
    .replace('{LIMIT}', clauses.LIMIT)
    .replace('{OFFSET}', clauses.OFFSET);
  return (await queryable.query(sql, values)).map(row => {
    const {
      id,
      officialId,
      name,
      departmentId,
      departmentName,
      periods,
      credits,
      audience,
      type,
      numClasses
    } = row;
    return {
      id,
      officialId,
      name,
      department: {
        id: departmentId,
        name: departmentName
      },
      periods,
      credits,
      audience,
      type,
      numClasses
    };
  });
}

export async function queryDepartments(
  queryable: Database | Transaction,
  options: {
    id?: number,
    keyword?: string,
    limit?: number,
    offset?: number
  }
): Promise<any[]> {
  const { id, limit, keyword, offset } = options;
  let sql = 'SELECT id, name, num_courses FROM department_view {WHERE} {ORDER_BY} {LIMIT} {OFFSET}';
  const clauses = {
    WHERE: 'WHERE TRUE',
    ORDER_BY: '',
    LIMIT: '',
    OFFSET: ''
  };
  const values = [] as any[];
  if (id !== undefined) {
    clauses.WHERE += ' AND id = ?';
    values.push(id);
  }
  clauses.ORDER_BY = 'ORDER BY id';
  if (keyword !== undefined) {
    clauses.WHERE += ' AND name LIKE ?';
    clauses.ORDER_BY = 'ORDER BY (name = ?) DESC, id';
    values.push(`%${keyword}%`, keyword);
  }
  if (limit !== undefined) {
    clauses.LIMIT = 'LIMIT ?';
    values.push(limit);
  }
  if (offset !== undefined) {
    clauses.OFFSET = 'OFFSET ?';
    values.push(offset);
  }
  sql = sql
    .replace('{WHERE}', clauses.WHERE)
    .replace('{ORDER_BY}', clauses.ORDER_BY)
    .replace('{LIMIT}', clauses.LIMIT)
    .replace('{OFFSET}', clauses.OFFSET);
  return await queryable.query(sql, values);
}

export async function queryReviews(
  queryable: Database | Transaction,
  options: {
    id?: number,
    classId?: number,
    userId?: number,
    noAnonymous?: boolean,
    limit?: number,
    offset?: number
  },
  myUserId?: number
): Promise<any[]> {
  const { id, classId, userId, noAnonymous, limit, offset } = options;
  let sql = `
SELECT
    review_view.id AS id,
    user.id AS user_id,
    user.username AS user_username,
    user.name AS user_name,
    user.gravatar_email AS user_gravatar_email,
    class.id AS class_id,
    course.id AS course_id,
    course.name AS course_name,
    review_view.year AS year,
    review_view.semester AS semester,
    review_view.rating AS rating,
    review_view.review AS review,
    review_view.anonymous AS anonymous,
    review_view.time AS time,
    review_view.upvotes AS upvotes,
    review_view.downvotes AS downvotes,
    review_view.num_comments AS num_comments,
    review_vote.vote AS my_vote
{FROM}
{WHERE}
{ORDER_BY}
{LIMIT}
{OFFSET}`;
  const clauses = {
    FROM: `FROM review_view
    JOIN user ON review_view.user_id = user.id
    JOIN class ON review_view.class_id = class.id
    JOIN course ON class.course_id = course.id`,
    WHERE: 'WHERE TRUE',
    ORDER_BY: '',
    LIMIT: '',
    OFFSET: ''
  };
  let values = [] as any[];
  if (myUserId !== undefined) {
    clauses.FROM += ' LEFT JOIN review_vote ON review_view.id = review_vote.review_id AND review_vote.user_id = ?';
    values.push(myUserId);
  } else {
    clauses.FROM += ' LEFT JOIN review_vote ON FALSE';
  }
  if (id !== undefined) {
    clauses.WHERE += ' AND review_view.id = ?';
    values.push(id);
  }
  if (classId !== undefined) {
    clauses.WHERE += ' AND class.id = ?';
    values.push(classId);
  }
  if (userId !== undefined) {
    clauses.WHERE += ' AND user.id = ?';
    values.push(userId);
  }
  if (noAnonymous) {
    clauses.WHERE += ' AND anonymous = FALSE';
  }
  clauses.ORDER_BY = 'ORDER BY review_view.time DESC';
  if (limit !== undefined) {
    clauses.LIMIT = 'LIMIT ?';
    values.push(limit);
  }
  if (offset !== undefined) {
    clauses.OFFSET = 'OFFSET ?';
    values.push(offset);
  }
  sql = sql
    .replace('{FROM}', clauses.FROM)
    .replace('{WHERE}', clauses.WHERE)
    .replace('{ORDER_BY}', clauses.ORDER_BY)
    .replace('{LIMIT}', clauses.LIMIT)
    .replace('{OFFSET}', clauses.OFFSET);
  const reviews = (await queryable.query(sql, values)).map(row => {
    const {
      id,
      userId,
      userUsername,
      userName,
      userGravatarEmail,
      classId,
      courseId,
      courseName,
      year,
      semester,
      rating,
      review,
      anonymous,
      time,
      upvotes,
      downvotes,
      numComments,
      myVote
    } = row;
    const userGravatarHash = computeGravatarHash(userGravatarEmail);
    return {
      id,
      user: anonymous ? null : {
        id: userId,
        username: userUsername,
        name: userName,
        gravatarHash: userGravatarHash,
      },
      class: {
        id: classId,
        course: {
          id: courseId,
          name: courseName
        },
        instructors: [] as any[]
      },
      year,
      semester,
      rating,
      review,
      time,
      upvotes,
      downvotes,
      numComments,
      myVote
    };
  });
  if (reviews.length > 0) {
    sql = `
SELECT
    class_staff.class_id AS class_id,
    staff.id AS staff_id,
    staff.name AS staff_name
FROM class_staff
    JOIN staff ON class_staff.staff_id = staff.id
WHERE class_staff.class_id IN (?)`;
    values = [reviews.map(review => review.class.id)];
    const classInstructors = new Map<number, any[]>();
    (await queryable.query(sql, values)).forEach(row => {
      const { classId, staffId, staffName } = row;
      if (!classInstructors.has(classId)) {
        classInstructors.set(classId, []);
      }
      classInstructors.get(classId)!.push({
        id: staffId,
        name: staffName
      });
    });
    for (const review of reviews) {
      review.class.instructors = classInstructors.get(review.class.id) ?? [];
    }
  }
  return reviews;
}

export async function queryStaffs(
  queryable: Database | Transaction,
  options: {
    id?: number,
    keyword?: string,
    limit?: number,
    offset?: number
  }
): Promise<any[]> {
  const { id, keyword, limit, offset } = options;
  let sql = 'SELECT id, official_id, name, num_classes FROM staff_view {WHERE} {ORDER_BY} {LIMIT} {OFFSET}';
  const clauses = {
    WHERE: 'WHERE TRUE',
    ORDER_BY: '',
    LIMIT: '',
    OFFSET: ''
  };
  const values = [] as any[];
  if (id !== undefined) {
    clauses.WHERE += ' AND id = ?';
    values.push(id);
  }
  clauses.ORDER_BY = 'ORDER BY id';
  if (keyword !== undefined) {
    clauses.WHERE += ' AND (official_id LIKE ? OR name LIKE ?)';
    clauses.ORDER_BY = 'ORDER BY (official_id = ? OR name = ?) DESC, id';
    values.push(`%${keyword}%`, `%${keyword}%`, keyword, keyword);
  }
  if (limit !== undefined) {
    clauses.LIMIT = 'LIMIT ?';
    values.push(limit);
  }
  if (offset !== undefined) {
    clauses.OFFSET = 'OFFSET ?';
    values.push(offset);
  }
  sql = sql
    .replace('{WHERE}', clauses.WHERE)
    .replace('{ORDER_BY}', clauses.ORDER_BY)
    .replace('{LIMIT}', clauses.LIMIT)
    .replace('{OFFSET}', clauses.OFFSET);
  return await queryable.query(sql, values);
}

export async function queryUsers(
  queryable: Database | Transaction,
  options: {
    id?: number,
    keyword?: string,
    limit?: number,
    offset?: number
  }
): Promise<any[]> {
  const { id, keyword, limit, offset } = options;
  let sql = `
SELECT
    id,
    username,
    name,
    gravatar_email,
    registration_time,
    num_reviews,
    num_effective_reviews
FROM user_view
{WHERE}
{ORDER_BY}
{LIMIT}
{OFFSET}`;
  const clauses = {
    WHERE: 'WHERE TRUE',
    ORDER_BY: '',
    LIMIT: '',
    OFFSET: ''
  };
  const values = [] as any[];
  if (id !== undefined) {
    clauses.WHERE += ' AND id = ?';
    values.push(id);
  }
  clauses.ORDER_BY = 'ORDER BY id';
  if (keyword !== undefined) {
    clauses.WHERE += ' AND (username LIKE ? OR name LIKE ?)';
    clauses.ORDER_BY = 'ORDER BY (username = ? OR name = ?) DESC, id';
    values.push(`%${keyword}%`, `%${keyword}%`, keyword, keyword);
  }
  if (limit !== undefined) {
    clauses.LIMIT = 'LIMIT ?';
    values.push(limit);
  }
  if (offset !== undefined) {
    clauses.OFFSET = 'OFFSET ?';
    values.push(offset);
  }
  sql = sql
    .replace('{WHERE}', clauses.WHERE)
    .replace('{ORDER_BY}', clauses.ORDER_BY)
    .replace('{LIMIT}', clauses.LIMIT)
    .replace('{OFFSET}', clauses.OFFSET);
  return (await queryable.query(sql, values)).map(row => {
    const {
      id,
      username,
      name,
      gravatarEmail,
      registrationTime,
      numReviews,
      numEffectiveReviews
    } = row;
    const gravatarHash = computeGravatarHash(gravatarEmail);
    return {
      id,
      username,
      name,
      gravatarHash,
      registrationTime,
      numReviews,
      numEffectiveReviews
    };
  });
}
