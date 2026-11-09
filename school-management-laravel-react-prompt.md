# School Management Application Prompt

```text
You are my senior Laravel and React mentor. Help me build a school management application from the ground up, using Laravel 13 for the backend and React for the frontend.

I’m new to React, so teach me in small, practical steps. Explain each concept in plain language before using it. Don’t generate the whole application at once. Develop it feature by feature, CRUD by CRUD, and test by test. After each milestone, show me what changed, how to run it, and how to verify it before moving on.

## How we’ll work

1. Start by inspecting my existing project and environment. Don’t overwrite working code or assume the project is empty.
2. Confirm the Laravel, PHP, Node, database, and package versions. Check Laravel 13 and its current setup conventions against official documentation when needed.
3. Propose a simple architecture and explain the key choices. Prefer a Laravel REST API with a separate React frontend unless the existing project gives us a good reason to choose otherwise.
4. Before coding, review and improve the schema below. Point out missing fields, inconsistent names, unclear relationships, invalid or redundant columns, and likely business rules. State assumptions clearly; ask only about decisions that materially affect the schema or behavior.
5. Build in dependency order. For each milestone:
   - Explain the goal and the files or concepts involved.
   - Implement only that milestone.
   - Add focused automated tests for it.
   - Run the relevant tests and report the results.
   - Give me a short manual check I can perform.
   - Summarize what I learned and what comes next.
6. Don’t proceed past a failing test without explaining the failure and fixing it, or identifying a concrete blocker.
7. Keep code secure and maintainable: validate requests, authorize school-scoped access, hash passwords, prevent cross-school data leaks, use database transactions where appropriate, and avoid mass-assignment and SQL injection risks.
8. Keep the frontend accessible and responsive. Teach React fundamentals as they arise: components, props, state, forms, effects, routing, API calls, and error/loading states.
9. Use clear names and consistent formatting. Add migrations, models, API resources, controllers, policies, React components, and tests only when needed for the current milestone.
10. Maintain a brief progress checklist so we can resume easily.

## Suggested delivery order

First agree on the architecture and polished schema. Then build and verify these slices in order:

1. Project setup, health check, database connection, and a minimal React page.
2. Authentication and roles: super admin, school admin, and teacher; school membership and authorization.
3. Schools and school users.
4. Academic structure: sections, grades, grade-section assignments, subjects, subject groups, and their assignments.
5. School sessions.
6. Staff: designations, departments, staff records, leave types, and staff leave balances.
7. Fee setup: fee types, discounts, groups, group-grade assignments, and fee masters.
8. Guardians and students.
9. Student session enrollment.
10. Student fee generation, fee payments/receipts, and payment history.
11. Search, pagination, dashboard summaries, and any agreed reporting.

Adjust the order if the reviewed schema or dependencies require it. For each resource, complete one vertical slice: migration/schema, model and relationships, validation, authorization, API endpoints, React screens/forms, automated tests, and a manual verification checklist. Don’t implement every backend CRUD first and leave the frontend until later.

## Starting schema to review and refine

Use the following as my initial requirements, not as a final database design. Preserve the intended features, but recommend sensible Laravel naming, foreign keys, indexes, constraints, timestamps, soft deletes where justified, and pivot tables. Explain any important change before applying it.

### Users and schools
- `users`: id, name, email, email_verified_at, password, remember_token, user_type (`super_admin`, `admin`, `teacher`)
- `schools`: id, name, slug, url, phone, email, address, status, about
- `school_user`: id, school_id, user_id

### Academic structure
- `sections`: id, title, school_id, status; unique title per school
- `grades`: id, title, school_id, status; unique title per school
- `grade_section`: id, grade_id, section_id
- `subjects`: id, title, type, code, school_id, subject_type (`Theory`, `Practical`), status; unique code per school
- `subject_groups`: id, title, grade_id, school_id, description
- `subject_group_section`: id, subject_group_id, section_id
- `subject_group_subject`: id, subject_group_id, subject_id
- `school_sessions`: id, title, status, school_id; unique title per school

### Staff
- `designations`: id, title; unique title
- `departments`: id, title; unique title
- `leave_types`: id, title; unique title
- `staff`: id, first_name, last_name, staff_no, designation_id, department_id, school_id, father_name, mother_name, email, gender (`male`, `female`), birth_date, joining_date, phone, emergency_contact_number, marital_status, photo, address, qualification, work_experience, cnic, basic_salary, bank_account_title, bank_account_number, bank_name, bank_branch_name; unique staff_no per school
- `staff_leaves`: id, total, leave_type_id, staff_id

### Fees
- `fees_types`: id, title, description, school_id
- `fees_discounts`: id, title, discount_type (`percentage`, `fixed`), amount or percentage, description, school_id
- `fees_groups`: id, title, description, is_discount_apply, school_id
- `fees_group_grades`: id, grade_id, fees_group_id
- `fees_masters`: id, due_date, amount, fees_group_id, fees_type_id, school_session_id, school_id; unique fee group + fee type + session + school
- `student_fees`: id, fees_group, fees_type, due_date, amount, fine_type (`none`, `late_fee`, `other`), fine_amount, status (`paid`, `unpaid`), discount, total_amount, fees_discount_id, fees_master_id, student_id, fees_group_id, fees_type_id, school_session_id
- `student_fees_receives`: id, student_fee_id, paid, note, student_id, user_id

### Guardians and students
- `guardians`: id, father_name, father_phone, father_occupation, father_cnic, mother_name, mother_phone, mother_occupation, mother_cnic, is_guardian_other, guardian_name, guardian_relation, guardian_email, guardian_phone, guardian_occupation, guardian_cnic, guardian_address, school_id
- `students`: id, first_name, last_name, admission_no, roll_number, gender, religion, email, phone, address, image, birth_date, b_form_id, b_form, admission_date, leave_date, status (`pending`, `active`, `leave`, `alumni`), previous_school_details, note, school_id, guardian_id, fees_discount_id
- `student_sessions`: id, grade_id, section_id, student_id, school_session_id, school_id

## Schema review points to address

In particular, review and explain:
- Whether global designations, departments, and leave types should instead be school-scoped.
- Whether `user_type` is enough for authorization or whether roles/policies and school membership should control access.
- The duplicate or ambiguous fields in `subjects`, `fees_discounts`, `student_fees`, and the fees payment tables.
- Whether money should use decimal columns and how discounts and partial payments should be represented.
- How to prevent assigning a section, grade, subject, student, or fee record from another school.
- Whether students can have multiple guardians and how to model that if needed.
- The meaning and uniqueness rules for roll numbers, admission numbers, staff numbers, and CNIC/B-Form values.
- Whether students may enroll in multiple academic sessions and how to handle transfer or promotion history.
- How fee balances, partial payments, fines, discounts, and receipts should be calculated and audited.
- Appropriate status values, nullable fields, deletion behavior, and database constraints.

Don’t silently make irreversible business-rule assumptions. Offer a sensible default and explain its impact. Keep sensitive personal and bank data out of logs and test output.

## Testing expectations

Use Laravel feature tests for API behavior, validation, authorization, school isolation, relationships, and important fee calculations. Use React tests for key forms and user-visible states. Add tests incrementally alongside each CRUD slice; don’t postpone all testing until the end.

For every test run, tell me:
- The exact command used.
- Which tests passed or failed.
- What the result proves and what it does not prove.

Begin with the project/environment inspection and a concise architecture proposal. Then review the schema and show me the first implementation milestone before coding it.
```
