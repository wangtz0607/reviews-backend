CREATE TABLE user (
    id INT NOT NULL AUTO_INCREMENT,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    gravatar_email VARCHAR(255),
    registration_time DATETIME NOT NULL,
    suspended BOOL NOT NULL DEFAULT FALSE,
    PRIMARY KEY (id)
);

CREATE TABLE email_update (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expiry_time DATETIME NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES user (id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE password_reset (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expiry_time DATETIME NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES user (id)
);

CREATE TABLE department (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE course (
    id INT NOT NULL AUTO_INCREMENT,
    official_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    department_id INT NOT NULL,
    periods INT NOT NULL,
    credits DOUBLE NOT NULL,
    audience VARCHAR(255) NOT NULL,
    type VARCHAR(255) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (department_id) REFERENCES department (id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE staff (
    id INT NOT NULL AUTO_INCREMENT,
    official_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE class (
    id INT NOT NULL AUTO_INCREMENT,
    course_id INT NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (course_id) REFERENCES course (id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE class_staff (
    class_id INT NOT NULL,
    staff_id INT NOT NULL,
    PRIMARY KEY (class_id, staff_id),
    FOREIGN KEY (class_id) REFERENCES class (id) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES staff (id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE review (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    class_id INT NOT NULL,
    year INT NOT NULL,
    semester VARCHAR(255) NOT NULL,
    rating INT NOT NULL,
    review MEDIUMTEXT NOT NULL,
    anonymous BOOL NOT NULL,
    time DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT UNIQUE (user_id, class_id),
    FOREIGN KEY (user_id) REFERENCES user (id) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES class (id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE review_vote (
    user_id INT NOT NULL,
    review_id INT NOT NULL,
    vote CHAR(1) NOT NULL,
    PRIMARY KEY (user_id, review_id),
    FOREIGN KEY (user_id) REFERENCES user (id) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (review_id) REFERENCES review (id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE comment (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    review_id INT NOT NULL,
    comment MEDIUMTEXT NOT NULL,
    time DATETIME NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES user (id) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (review_id) REFERENCES review (id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE comment_vote (
    user_id INT NOT NULL,
    comment_id INT NOT NULL,
    vote CHAR(1) NOT NULL,
    PRIMARY KEY (user_id, comment_id),
    FOREIGN KEY (user_id) REFERENCES user (id) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (comment_id) REFERENCES comment (id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE VIEW department_view AS
SELECT
    id,
    name,
    (SELECT COUNT(*) FROM course WHERE course.department_id = department.id) AS num_courses
FROM department;

CREATE VIEW course_view AS
SELECT
    id,
    official_id,
    name,
    department_id,
    periods,
    credits,
    audience,
    type,
    (SELECT COUNT(*) FROM class WHERE class.course_id = course.id) AS num_classes
FROM course;

CREATE VIEW staff_view AS
SELECT
    id,
    official_id,
    name,
    (SELECT COUNT(*) FROM class_staff WHERE class_staff.staff_id = staff.id) AS num_classes
FROM staff;

CREATE VIEW review_view AS
SELECT
    id,
    user_id,
    class_id,
    year,
    semester,
    rating,
    review,
    anonymous,
    time,
    (SELECT COUNT(*) FROM review_vote WHERE review_vote.review_id = review.id AND review_vote.vote = 'U') AS upvotes,
    (SELECT COUNT(*) FROM review_vote WHERE review_vote.review_id = review.id AND review_vote.vote = 'D') AS downvotes,
    (SELECT COUNT(*) FROM comment WHERE comment.review_id = review.id) AS num_comments
FROM review;

CREATE VIEW class_view AS
SELECT
    id,
    course_id,
    (SELECT AVG(review_view.rating) FROM review_view WHERE review_view.class_id = class.id AND review_view.upvotes >= review_view.downvotes) AS rating,
    (SELECT COUNT(*) FROM review_view WHERE review_view.class_id = class.id) AS num_reviews,
    (SELECT COUNT(*) FROM review_view WHERE review_view.class_id = class.id AND review_view.upvotes >= review_view.downvotes) AS num_effective_reviews
FROM class;

CREATE VIEW comment_view AS
SELECT
    id,
    user_id,
    review_id,
    comment,
    time,
    (SELECT COUNT(*) FROM comment_vote WHERE comment_vote.comment_id = comment.id AND comment_vote.vote = 'U') AS upvotes,
    (SELECT COUNT(*) FROM comment_vote WHERE comment_vote.comment_id = comment.id AND comment_vote.vote = 'D') AS downvotes
FROM comment;

CREATE VIEW user_view AS
SELECT
    id,
    username,
    email,
    password_hash,
    name,
    gravatar_email,
    registration_time,
    (SELECT COUNT(*) FROM review_view WHERE review_view.user_id = user.id AND review_view.anonymous = FALSE) AS num_reviews,
    (SELECT COUNT(*) FROM review_view WHERE review_view.user_id = user.id AND review_view.anonymous = FALSE AND review_view.upvotes >= review_view.downvotes) AS num_effective_reviews
FROM user;
