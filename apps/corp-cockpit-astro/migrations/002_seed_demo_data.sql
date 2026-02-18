-- CSR Cockpit - Demo Seed Data
-- Database: D1 (SQLite)
-- Created: 2026-02-18
-- Purpose: Seed demo companies, users, volunteers, sessions, and SROI snapshots
--          so the app can render meaningful data without microservices.

-- ============================================
-- DEMO COMPANIES
-- ============================================
INSERT OR IGNORE INTO companies (id, name, slug, industry, employee_count, settings) VALUES
  ('comp_acme', 'Acme Corporation', 'acme', 'technology', 2500, '{"locale":"en","currency":"NOK"}'),
  ('comp_nordic', 'Nordic Solutions AS', 'nordic-solutions', 'consulting', 180, '{"locale":"no","currency":"NOK"}'),
  ('comp_green', 'GreenTech Industries', 'greentech', 'energy', 850, '{"locale":"en","currency":"EUR"}');

-- ============================================
-- DEMO USERS (passwords hashed with bcrypt - "admin123")
-- ============================================
-- bcrypt hash for "admin123" (10 rounds)
INSERT OR IGNORE INTO users (id, email, first_name, last_name, password_hash, role, email_verified) VALUES
  ('user_admin', 'admin@acme.com', 'Admin', 'User', '$2b$10$dPzMercVBMBQXGFZk1GBauRLNsEbHHGGOq1EAKSmBahe1FMSXxVK2', 'admin', 1),
  ('user_manager', 'manager@acme.com', 'Sarah', 'Johnson', '$2b$10$dPzMercVBMBQXGFZk1GBauRLNsEbHHGGOq1EAKSmBahe1FMSXxVK2', 'manager', 1),
  ('user_viewer', 'viewer@acme.com', 'Tom', 'Smith', '$2b$10$dPzMercVBMBQXGFZk1GBauRLNsEbHHGGOq1EAKSmBahe1FMSXxVK2', 'viewer', 1),
  ('user_nordic', 'admin@nordic.no', 'Kari', 'Nordmann', '$2b$10$dPzMercVBMBQXGFZk1GBauRLNsEbHHGGOq1EAKSmBahe1FMSXxVK2', 'admin', 1);

-- ============================================
-- COMPANY-USER RELATIONSHIPS
-- ============================================
INSERT OR IGNORE INTO company_users (id, user_id, company_id, role) VALUES
  ('cu_1', 'user_admin', 'comp_acme', 'admin'),
  ('cu_2', 'user_manager', 'comp_acme', 'manager'),
  ('cu_3', 'user_viewer', 'comp_acme', 'viewer'),
  ('cu_4', 'user_nordic', 'comp_nordic', 'admin');

-- ============================================
-- DEMO VOLUNTEERS (Acme Corporation)
-- ============================================
INSERT OR IGNORE INTO volunteers (id, company_id, email, first_name, last_name, department, job_title, total_hours, total_sessions, vis_score, is_active) VALUES
  ('vol_1', 'comp_acme', 'alice@acme.com', 'Alice', 'Chen', 'Engineering', 'Senior Developer', 42.5, 17, 78.3, 1),
  ('vol_2', 'comp_acme', 'bob@acme.com', 'Bob', 'Martinez', 'Marketing', 'Brand Manager', 28.0, 11, 65.1, 1),
  ('vol_3', 'comp_acme', 'carol@acme.com', 'Carol', 'Okonkwo', 'HR', 'People Partner', 56.0, 22, 85.7, 1),
  ('vol_4', 'comp_acme', 'david@acme.com', 'David', 'Lindberg', 'Finance', 'Controller', 15.5, 6, 52.4, 1),
  ('vol_5', 'comp_acme', 'emma@acme.com', 'Emma', 'Park', 'Engineering', 'Tech Lead', 35.0, 14, 72.9, 1),
  ('vol_6', 'comp_acme', 'frank@acme.com', 'Frank', 'Nielsen', 'Sales', 'Account Executive', 21.0, 8, 61.2, 1),
  ('vol_7', 'comp_acme', 'grace@acme.com', 'Grace', 'Patel', 'Product', 'Product Manager', 48.5, 19, 81.6, 1),
  ('vol_8', 'comp_acme', 'hans@acme.com', 'Hans', 'Muller', 'Engineering', 'DevOps Engineer', 12.0, 5, 48.8, 1),
  ('vol_9', 'comp_acme', 'iris@acme.com', 'Iris', 'Thompson', 'Legal', 'Counsel', 33.0, 13, 70.5, 1),
  ('vol_10', 'comp_acme', 'james@acme.com', 'James', 'Andersen', 'Design', 'UX Designer', 39.5, 16, 76.1, 1);

-- Nordic Solutions volunteers
INSERT OR IGNORE INTO volunteers (id, company_id, email, first_name, last_name, department, job_title, total_hours, total_sessions, vis_score, is_active) VALUES
  ('vol_n1', 'comp_nordic', 'ole@nordic.no', 'Ole', 'Hansen', 'Consulting', 'Senior Consultant', 24.0, 10, 68.4, 1),
  ('vol_n2', 'comp_nordic', 'liv@nordic.no', 'Liv', 'Berg', 'Management', 'Partner', 18.5, 7, 59.2, 1),
  ('vol_n3', 'comp_nordic', 'erik@nordic.no', 'Erik', 'Dahl', 'Technology', 'Architect', 31.0, 12, 73.8, 1);

-- ============================================
-- VOLUNTEER SESSIONS (Acme - last 6 months)
-- ============================================
INSERT OR IGNORE INTO volunteer_sessions (id, volunteer_id, program_id, company_id, session_date, duration_minutes, description, outcome_score, beneficiary_count, status) VALUES
  -- Alice (MFU mentor)
  ('vs_1', 'vol_1', 'prog_mfu', 'comp_acme', '2025-09-05', 120, 'Career planning with mentee Olena - CV review and LinkedIn optimization', 82, 1, 'completed'),
  ('vs_2', 'vol_1', 'prog_mfu', 'comp_acme', '2025-09-19', 90, 'Mock interview preparation for tech roles', 78, 1, 'completed'),
  ('vs_3', 'vol_1', 'prog_mfu', 'comp_acme', '2025-10-03', 120, 'Portfolio review and GitHub presence building', 85, 1, 'completed'),
  ('vs_4', 'vol_1', 'prog_mfu', 'comp_acme', '2025-10-17', 90, 'Networking strategies and Norwegian workplace culture', 80, 1, 'completed'),
  ('vs_5', 'vol_1', 'prog_skills', 'comp_acme', '2025-11-08', 180, 'Group workshop: Introduction to web development', 88, 8, 'completed'),
  ('vs_6', 'vol_1', 'prog_mfu', 'comp_acme', '2025-11-21', 90, 'Follow-up: mentee got first interview!', 92, 1, 'completed'),
  ('vs_7', 'vol_1', 'prog_mfu', 'comp_acme', '2025-12-05', 120, 'Salary negotiation tips and offer comparison', 86, 1, 'completed'),
  ('vs_8', 'vol_1', 'prog_mfu', 'comp_acme', '2026-01-09', 90, 'New year career goals and development plan', 81, 1, 'completed'),
  ('vs_9', 'vol_1', 'prog_skills', 'comp_acme', '2026-01-25', 180, 'Group workshop: React fundamentals', 90, 6, 'completed'),
  -- Bob (Language Connect)
  ('vs_10', 'vol_2', 'prog_lc', 'comp_acme', '2025-09-10', 60, 'Norwegian conversation practice - workplace scenarios', 70, 2, 'completed'),
  ('vs_11', 'vol_2', 'prog_lc', 'comp_acme', '2025-09-24', 60, 'Vocabulary building for business communication', 72, 2, 'completed'),
  ('vs_12', 'vol_2', 'prog_lc', 'comp_acme', '2025-10-08', 60, 'Reading comprehension and news discussion', 68, 2, 'completed'),
  ('vs_13', 'vol_2', 'prog_lc', 'comp_acme', '2025-10-22', 60, 'Role-playing job interview in Norwegian', 75, 2, 'completed'),
  ('vs_14', 'vol_2', 'prog_lc', 'comp_acme', '2025-11-05', 90, 'Cultural exchange: Norwegian traditions', 80, 3, 'completed'),
  ('vs_15', 'vol_2', 'prog_lc', 'comp_acme', '2025-11-19', 60, 'Writing practice - email and formal letters', 71, 2, 'completed'),
  ('vs_16', 'vol_2', 'prog_lc', 'comp_acme', '2025-12-03', 60, 'Grammar review and conversation', 73, 2, 'completed'),
  ('vs_17', 'vol_2', 'prog_lc', 'comp_acme', '2025-12-17', 90, 'End of year social Norwegian event', 82, 4, 'completed'),
  ('vs_18', 'vol_2', 'prog_lc', 'comp_acme', '2026-01-14', 60, 'New semester kickoff - conversation practice', 69, 2, 'completed'),
  ('vs_19', 'vol_2', 'prog_lc', 'comp_acme', '2026-01-28', 60, 'Phone conversation practice', 74, 2, 'completed'),
  ('vs_20', 'vol_2', 'prog_lc', 'comp_acme', '2026-02-11', 60, 'Presentation skills in Norwegian', 76, 2, 'completed'),
  -- Carol (Women Buddy Program)
  ('vs_21', 'vol_3', 'prog_wbp', 'comp_acme', '2025-09-03', 90, 'Welcome session with new buddy Fatima', 85, 1, 'completed'),
  ('vs_22', 'vol_3', 'prog_wbp', 'comp_acme', '2025-09-17', 120, 'Helped with kindergarten application and NAV forms', 88, 1, 'completed'),
  ('vs_23', 'vol_3', 'prog_wbp', 'comp_acme', '2025-10-01', 90, 'Accompanied to housing viewing', 82, 1, 'completed'),
  ('vs_24', 'vol_3', 'prog_wbp', 'comp_acme', '2025-10-15', 120, 'CV writing and job search strategies', 86, 1, 'completed'),
  ('vs_25', 'vol_3', 'prog_wbp', 'comp_acme', '2025-10-29', 90, 'Healthcare system navigation - fastlege appointment', 79, 1, 'completed'),
  ('vs_26', 'vol_3', 'prog_wbp', 'comp_acme', '2025-11-12', 120, 'School meeting support for child enrollment', 90, 1, 'completed'),
  ('vs_27', 'vol_3', 'prog_wbp', 'comp_acme', '2025-11-26', 90, 'Financial planning and budgeting basics', 83, 1, 'completed'),
  ('vs_28', 'vol_3', 'prog_wbp', 'comp_acme', '2025-12-10', 150, 'Group event: Winter social for women and families', 91, 12, 'completed'),
  ('vs_29', 'vol_3', 'prog_wbp', 'comp_acme', '2025-12-30', 90, 'New Year planning and goal setting', 84, 1, 'completed'),
  ('vs_30', 'vol_3', 'prog_wbp', 'comp_acme', '2026-01-14', 120, 'Bank account setup and digital banking', 87, 1, 'completed'),
  ('vs_31', 'vol_3', 'prog_wbp', 'comp_acme', '2026-01-28', 90, 'Transportation navigation - Ruter app setup', 80, 1, 'completed'),
  ('vs_32', 'vol_3', 'prog_wbp', 'comp_acme', '2026-02-11', 120, 'Tax return filing assistance', 89, 1, 'completed'),
  -- Emma (MFU + Skills)
  ('vs_33', 'vol_5', 'prog_mfu', 'comp_acme', '2025-09-12', 120, 'Initial mentorship meeting with Dmytro', 80, 1, 'completed'),
  ('vs_34', 'vol_5', 'prog_mfu', 'comp_acme', '2025-10-10', 90, 'Technical skills assessment and learning path', 83, 1, 'completed'),
  ('vs_35', 'vol_5', 'prog_skills', 'comp_acme', '2025-10-24', 180, 'Workshop: Git and collaborative development', 87, 10, 'completed'),
  ('vs_36', 'vol_5', 'prog_mfu', 'comp_acme', '2025-11-07', 120, 'Code review session and best practices', 85, 1, 'completed'),
  ('vs_37', 'vol_5', 'prog_skills', 'comp_acme', '2025-11-21', 180, 'Workshop: CI/CD and deployment basics', 89, 8, 'completed'),
  ('vs_38', 'vol_5', 'prog_mfu', 'comp_acme', '2025-12-12', 90, 'Year-end review - mentee progress celebration', 91, 1, 'completed'),
  ('vs_39', 'vol_5', 'prog_mfu', 'comp_acme', '2026-01-16', 120, 'Project portfolio review for job applications', 84, 1, 'completed'),
  ('vs_40', 'vol_5', 'prog_skills', 'comp_acme', '2026-02-06', 180, 'Workshop: Cloud infrastructure basics', 86, 7, 'completed'),
  -- Grace (mixed programs)
  ('vs_41', 'vol_7', 'prog_mfu', 'comp_acme', '2025-09-08', 90, 'Product management career path discussion', 77, 1, 'completed'),
  ('vs_42', 'vol_7', 'prog_mfu', 'comp_acme', '2025-10-06', 120, 'Agile methodology workshop for mentee', 82, 1, 'completed'),
  ('vs_43', 'vol_7', 'prog_lc', 'comp_acme', '2025-10-20', 60, 'Norwegian practice: tech industry vocabulary', 70, 2, 'completed'),
  ('vs_44', 'vol_7', 'prog_mfu', 'comp_acme', '2025-11-03', 90, 'Stakeholder management and communication skills', 79, 1, 'completed'),
  ('vs_45', 'vol_7', 'prog_skills', 'comp_acme', '2025-11-17', 180, 'Workshop: User research and UX basics', 88, 6, 'completed'),
  ('vs_46', 'vol_7', 'prog_mfu', 'comp_acme', '2025-12-01', 120, 'Product roadmap creation exercise', 84, 1, 'completed'),
  ('vs_47', 'vol_7', 'prog_lc', 'comp_acme', '2025-12-15', 60, 'Norwegian Christmas culture discussion', 76, 2, 'completed'),
  ('vs_48', 'vol_7', 'prog_mfu', 'comp_acme', '2026-01-12', 90, 'Resume and cover letter review', 81, 1, 'completed'),
  ('vs_49', 'vol_7', 'prog_skills', 'comp_acme', '2026-01-26', 180, 'Workshop: Data analysis for beginners', 87, 9, 'completed'),
  -- David, Frank, Hans, Iris, James (lighter involvement)
  ('vs_50', 'vol_4', 'prog_lc', 'comp_acme', '2025-10-15', 60, 'Norwegian conversation - finance vocabulary', 65, 2, 'completed'),
  ('vs_51', 'vol_4', 'prog_lc', 'comp_acme', '2025-11-12', 60, 'Tax system explanation in Norwegian', 72, 2, 'completed'),
  ('vs_52', 'vol_4', 'prog_mfu', 'comp_acme', '2025-12-03', 90, 'Financial literacy mentoring', 78, 1, 'completed'),
  ('vs_53', 'vol_4', 'prog_mfu', 'comp_acme', '2026-01-21', 120, 'Bookkeeping basics and Norwegian standards', 80, 1, 'completed'),
  ('vs_54', 'vol_4', 'prog_lc', 'comp_acme', '2026-02-04', 60, 'Advanced Norwegian conversation', 74, 2, 'completed'),
  ('vs_55', 'vol_6', 'prog_mfu', 'comp_acme', '2025-10-08', 90, 'Sales career mentoring session', 75, 1, 'completed'),
  ('vs_56', 'vol_6', 'prog_lc', 'comp_acme', '2025-11-05', 60, 'Norwegian small talk and networking', 68, 2, 'completed'),
  ('vs_57', 'vol_6', 'prog_mfu', 'comp_acme', '2025-12-10', 120, 'Customer service role-play exercises', 82, 1, 'completed'),
  ('vs_58', 'vol_6', 'prog_lc', 'comp_acme', '2026-01-07', 60, 'Norwegian phone and email etiquette', 70, 2, 'completed'),
  ('vs_59', 'vol_8', 'prog_skills', 'comp_acme', '2025-11-14', 180, 'Workshop: Linux and command line basics', 85, 5, 'completed'),
  ('vs_60', 'vol_8', 'prog_skills', 'comp_acme', '2025-12-19', 180, 'Workshop: Networking and security fundamentals', 83, 4, 'completed'),
  ('vs_61', 'vol_8', 'prog_mfu', 'comp_acme', '2026-01-30', 90, 'DevOps career path guidance', 79, 1, 'completed'),
  ('vs_62', 'vol_9', 'prog_wbp', 'comp_acme', '2025-09-22', 120, 'Legal rights and residency guidance', 88, 1, 'completed'),
  ('vs_63', 'vol_9', 'prog_wbp', 'comp_acme', '2025-10-20', 90, 'Employment contract review and rights', 86, 1, 'completed'),
  ('vs_64', 'vol_9', 'prog_wbp', 'comp_acme', '2025-11-17', 120, 'Family reunification process guidance', 90, 1, 'completed'),
  ('vs_65', 'vol_9', 'prog_wbp', 'comp_acme', '2025-12-15', 90, 'Tenant rights and housing law basics', 84, 1, 'completed'),
  ('vs_66', 'vol_9', 'prog_wbp', 'comp_acme', '2026-01-12', 120, 'Immigration paperwork assistance', 87, 1, 'completed'),
  ('vs_67', 'vol_10', 'prog_mfu', 'comp_acme', '2025-09-15', 90, 'Portfolio review for design career', 79, 1, 'completed'),
  ('vs_68', 'vol_10', 'prog_skills', 'comp_acme', '2025-10-13', 180, 'Workshop: Figma for beginners', 90, 7, 'completed'),
  ('vs_69', 'vol_10', 'prog_mfu', 'comp_acme', '2025-11-10', 120, 'UX case study development', 84, 1, 'completed'),
  ('vs_70', 'vol_10', 'prog_skills', 'comp_acme', '2025-12-08', 180, 'Workshop: Design systems fundamentals', 88, 6, 'completed'),
  ('vs_71', 'vol_10', 'prog_mfu', 'comp_acme', '2026-01-06', 90, 'Design job market in Norway', 81, 1, 'completed'),
  ('vs_72', 'vol_10', 'prog_mfu', 'comp_acme', '2026-02-03', 120, 'Interview portfolio presentation prep', 86, 1, 'completed');

-- Nordic Solutions sessions
INSERT OR IGNORE INTO volunteer_sessions (id, volunteer_id, program_id, company_id, session_date, duration_minutes, description, outcome_score, beneficiary_count, status) VALUES
  ('vs_n1', 'vol_n1', 'prog_mfu', 'comp_nordic', '2025-09-20', 120, 'Management consulting career mentoring', 80, 1, 'completed'),
  ('vs_n2', 'vol_n1', 'prog_mfu', 'comp_nordic', '2025-10-18', 90, 'Case study practice and analytical thinking', 82, 1, 'completed'),
  ('vs_n3', 'vol_n1', 'prog_skills', 'comp_nordic', '2025-11-15', 180, 'Workshop: Presentation and public speaking', 86, 5, 'completed'),
  ('vs_n4', 'vol_n1', 'prog_mfu', 'comp_nordic', '2025-12-13', 120, 'Norwegian business culture deep dive', 83, 1, 'completed'),
  ('vs_n5', 'vol_n1', 'prog_mfu', 'comp_nordic', '2026-01-17', 90, 'Networking event preparation', 78, 1, 'completed'),
  ('vs_n6', 'vol_n2', 'prog_wbp', 'comp_nordic', '2025-10-05', 90, 'Women in leadership discussion', 81, 1, 'completed'),
  ('vs_n7', 'vol_n2', 'prog_wbp', 'comp_nordic', '2025-11-02', 120, 'Professional identity and confidence building', 85, 1, 'completed'),
  ('vs_n8', 'vol_n2', 'prog_wbp', 'comp_nordic', '2025-12-07', 90, 'Work-life balance strategies', 79, 1, 'completed'),
  ('vs_n9', 'vol_n2', 'prog_lc', 'comp_nordic', '2026-01-11', 60, 'Norwegian business vocabulary', 72, 2, 'completed'),
  ('vs_n10', 'vol_n3', 'prog_skills', 'comp_nordic', '2025-09-27', 180, 'Workshop: Cloud architecture overview', 88, 8, 'completed'),
  ('vs_n11', 'vol_n3', 'prog_mfu', 'comp_nordic', '2025-10-25', 120, 'IT architecture career mentoring', 84, 1, 'completed'),
  ('vs_n12', 'vol_n3', 'prog_skills', 'comp_nordic', '2025-11-22', 180, 'Workshop: Database design patterns', 87, 6, 'completed'),
  ('vs_n13', 'vol_n3', 'prog_mfu', 'comp_nordic', '2025-12-20', 90, 'Year-end review and goal setting', 82, 1, 'completed'),
  ('vs_n14', 'vol_n3', 'prog_skills', 'comp_nordic', '2026-01-24', 180, 'Workshop: API design best practices', 89, 7, 'completed');

-- ============================================
-- SROI SNAPSHOTS (Pre-calculated metrics)
-- ============================================

-- Acme Q3 2025
INSERT OR IGNORE INTO sroi_snapshots (id, company_id, period, period_start, period_end, total_hours, total_value, total_volunteers, total_sessions, total_beneficiaries, sroi_ratio, avg_vis_score, program_breakdown) VALUES
  ('snap_acme_q3', 'comp_acme', '2025-Q3', '2025-07-01', '2025-09-30', 82.0, 18040.00, 8, 12, 18, 3.42, 72.1, '{"mfu":{"hours":30,"sessions":4,"value":6600},"lc":{"hours":6,"sessions":4,"value":1320},"wbp":{"hours":12.5,"sessions":3,"value":1875},"skills":{"hours":33.5,"sessions":1,"value":7370}}');

-- Acme Q4 2025
INSERT OR IGNORE INTO sroi_snapshots (id, company_id, period, period_start, period_end, total_hours, total_value, total_volunteers, total_sessions, total_beneficiaries, sroi_ratio, avg_vis_score, program_breakdown) VALUES
  ('snap_acme_q4', 'comp_acme', '2025-Q4', '2025-10-01', '2025-12-31', 168.5, 37070.00, 10, 32, 54, 3.78, 74.8, '{"mfu":{"hours":52,"sessions":12,"value":11440},"lc":{"hours":18,"sessions":8,"value":3960},"wbp":{"hours":39.5,"sessions":7,"value":5925},"skills":{"hours":59,"sessions":5,"value":12980}}');

-- Acme Q1 2026
INSERT OR IGNORE INTO sroi_snapshots (id, company_id, period, period_start, period_end, total_hours, total_value, total_volunteers, total_sessions, total_beneficiaries, sroi_ratio, avg_vis_score, program_breakdown) VALUES
  ('snap_acme_q1', 'comp_acme', '2026-Q1', '2026-01-01', '2026-03-31', 120.0, 26400.00, 10, 22, 42, 3.65, 76.3, '{"mfu":{"hours":38.5,"sessions":9,"value":8470},"lc":{"hours":10,"sessions":5,"value":2200},"wbp":{"hours":20.5,"sessions":4,"value":3075},"skills":{"hours":51,"sessions":4,"value":11220}}');

-- Acme YTD 2025
INSERT OR IGNORE INTO sroi_snapshots (id, company_id, period, period_start, period_end, total_hours, total_value, total_volunteers, total_sessions, total_beneficiaries, sroi_ratio, avg_vis_score, program_breakdown) VALUES
  ('snap_acme_ytd', 'comp_acme', 'ytd-2025', '2025-01-01', '2025-12-31', 250.5, 55110.00, 10, 44, 72, 3.62, 73.5, '{"mfu":{"hours":82,"sessions":16,"value":18040},"lc":{"hours":24,"sessions":12,"value":5280},"wbp":{"hours":52,"sessions":10,"value":7800},"skills":{"hours":92.5,"sessions":6,"value":20350}}');

-- Nordic Q4 2025
INSERT OR IGNORE INTO sroi_snapshots (id, company_id, period, period_start, period_end, total_hours, total_value, total_volunteers, total_sessions, total_beneficiaries, sroi_ratio, avg_vis_score, program_breakdown) VALUES
  ('snap_nordic_q4', 'comp_nordic', '2025-Q4', '2025-10-01', '2025-12-31', 38.5, 8250.00, 3, 8, 14, 3.21, 68.7, '{"mfu":{"hours":12,"sessions":3,"value":2640},"lc":{"hours":0,"sessions":0,"value":0},"wbp":{"hours":8.5,"sessions":3,"value":1275},"skills":{"hours":18,"sessions":2,"value":3960}}');

-- Nordic Q1 2026
INSERT OR IGNORE INTO sroi_snapshots (id, company_id, period, period_start, period_end, total_hours, total_value, total_volunteers, total_sessions, total_beneficiaries, sroi_ratio, avg_vis_score, program_breakdown) VALUES
  ('snap_nordic_q1', 'comp_nordic', '2026-Q1', '2026-01-01', '2026-03-31', 22.0, 4730.00, 3, 4, 11, 3.15, 70.2, '{"mfu":{"hours":6,"sessions":2,"value":1320},"lc":{"hours":1,"sessions":1,"value":220},"wbp":{"hours":0,"sessions":0,"value":0},"skills":{"hours":15,"sessions":1,"value":3300}}');

-- ============================================
-- DEMO CAMPAIGNS
-- ============================================
INSERT OR IGNORE INTO campaigns (id, company_id, name, description, goal_hours, goal_volunteers, start_date, end_date, status) VALUES
  ('camp_1', 'comp_acme', 'Q1 2026 Volunteer Drive', 'Kick off the new year with renewed commitment to mentoring and skills sharing', 200, 15, '2026-01-01', '2026-03-31', 'active'),
  ('camp_2', 'comp_acme', 'International Womens Day 2026', 'Special Women Buddy Program events around March 8th', 50, 8, '2026-03-01', '2026-03-15', 'draft'),
  ('camp_3', 'comp_acme', 'Summer Skills Bootcamp 2025', 'Intensive 2-week skills workshops for refugees entering tech', 150, 12, '2025-06-15', '2025-06-30', 'completed'),
  ('camp_4', 'comp_nordic', 'Nordic Mentoring Launch', 'Initial rollout of TEEI mentoring program at Nordic Solutions', 100, 5, '2025-09-01', '2025-12-31', 'completed');

-- ============================================
-- DEMO REPORTS
-- ============================================
INSERT OR IGNORE INTO reports (id, company_id, title, type, period_start, period_end, status, created_by) VALUES
  ('rep_1', 'comp_acme', 'Q3 2025 CSR Impact Report', 'quarterly', '2025-07-01', '2025-09-30', 'published', 'user_admin'),
  ('rep_2', 'comp_acme', 'Q4 2025 CSR Impact Report', 'quarterly', '2025-10-01', '2025-12-31', 'published', 'user_admin'),
  ('rep_3', 'comp_acme', '2025 Annual CSRD Compliance Report', 'csrd', '2025-01-01', '2025-12-31', 'draft', 'user_manager'),
  ('rep_4', 'comp_nordic', 'H2 2025 Impact Summary', 'quarterly', '2025-07-01', '2025-12-31', 'published', 'user_nordic');
