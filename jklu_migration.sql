-- =====================================================================
-- JK Lakshmipat University (JKLU) - Hostel Management System
-- Migration and Setup SQL Script
-- File: jklu_migration.sql
-- =====================================================================
-- This migration script safely provisions the JKLU register tables and
-- aligns existing schemas to support the 4 official JKLU hostels:
-- GH1 (Girls Hostel 1), GH2 (Girls Hostel 2), BH1 (Boys Hostel 1), BH2 (Boys Hostel 2).
-- =====================================================================

USE hostel_management;

-- 1. Ensure Hostels match JKLU 4 Hostels
INSERT INTO Hostel (hostel_id, hostel_code, hostel_name, total_floors, gender, address)
VALUES 
  (1, 'GH1', 'Girls Hostel 1 (GH1)', 4, 'Girls', 'JKLU Campus, South Residential Zone'),
  (2, 'GH2', 'Girls Hostel 2 (GH2 - Flats)', 4, 'Girls', 'JKLU Campus, South Residential Zone'),
  (3, 'BH1', 'Boys Hostel 1 (BH1)', 4, 'Boys', 'JKLU Campus, North Residential Zone'),
  (4, 'BH2', 'Boys Hostel 2 (BH2)', 4, 'Boys', 'JKLU Campus, North Residential Zone')
ON DUPLICATE KEY UPDATE 
  hostel_code = VALUES(hostel_code),
  hostel_name = VALUES(hostel_name),
  gender = VALUES(gender);

-- 2. Ensure Register Tables exist
CREATE TABLE IF NOT EXISTS register_complaints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    complaint_date DATE NOT NULL,
    student_name VARCHAR(100) NOT NULL,
    student_roll_no VARCHAR(50) NULL,
    hostel_code ENUM('GH1', 'GH2', 'BH1', 'BH2') NOT NULL,
    room_no VARCHAR(20) NOT NULL,
    complaint_type VARCHAR(100) NOT NULL,
    complaint_details TEXT NOT NULL,
    status ENUM('Pending', 'In Progress', 'Resolved') NOT NULL DEFAULT 'Pending',
    resolved_date DATE NULL,
    action_taken TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cleaning_register (
    cleaning_id INT AUTO_INCREMENT PRIMARY KEY,
    hostel_code ENUM('GH1', 'GH2', 'BH1', 'BH2') NOT NULL,
    floor_or_area VARCHAR(100) NOT NULL,
    cleaner_name VARCHAR(100) NOT NULL,
    cleaning_date DATE NOT NULL,
    cleaning_time TIME NOT NULL,
    inspection_status ENUM('Satisfactory', 'Needs Attention', 'Re-cleaned') NOT NULL DEFAULT 'Satisfactory',
    remarks VARCHAR(255) NULL,
    inspected_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS student_out_register (
    out_id INT AUTO_INCREMENT PRIMARY KEY,
    student_name VARCHAR(100) NOT NULL,
    roll_no VARCHAR(50) NULL,
    hostel_code ENUM('GH1', 'GH2', 'BH1', 'BH2') NOT NULL,
    room_no VARCHAR(20) NOT NULL,
    destination VARCHAR(200) NOT NULL,
    out_date DATE NOT NULL,
    out_time TIME NOT NULL,
    expected_in_date DATE NOT NULL,
    expected_in_time TIME NOT NULL,
    actual_in_date DATE NULL,
    actual_in_time TIME NULL,
    contact_number VARCHAR(20) NOT NULL,
    parent_consent_status ENUM('Approved', 'Pending', 'Not Required') NOT NULL DEFAULT 'Approved',
    remarks VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS late_night_entry (
    entry_id INT AUTO_INCREMENT PRIMARY KEY,
    student_name VARCHAR(100) NOT NULL,
    roll_no VARCHAR(50) NULL,
    hostel_code ENUM('GH1', 'GH2', 'BH1', 'BH2') NOT NULL,
    room_no VARCHAR(20) NOT NULL,
    entry_date DATE NOT NULL,
    entry_time TIME NOT NULL,
    reason_for_late TEXT NOT NULL,
    guard_on_duty VARCHAR(100) NOT NULL,
    warden_notified BOOLEAN NOT NULL DEFAULT TRUE,
    action_or_remarks VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attendance_register (
    attendance_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NULL,
    student_name VARCHAR(100) NOT NULL,
    roll_no VARCHAR(50) NULL,
    hostel_code ENUM('GH1', 'GH2', 'BH1', 'BH2') NOT NULL,
    room_no VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    status ENUM('Present', 'Absent', 'Leave', 'Sick') NOT NULL DEFAULT 'Present',
    remarks VARCHAR(150) NULL,
    recorded_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS maintenance_register (
    maint_id INT AUTO_INCREMENT PRIMARY KEY,
    hostel_code ENUM('GH1', 'GH2', 'BH1', 'BH2') NOT NULL,
    location_or_room VARCHAR(50) NOT NULL,
    issue_description TEXT NOT NULL,
    work_type ENUM('Electrical', 'Plumbing', 'Carpentry', 'Civil', 'Appliance', 'Other') NOT NULL,
    reported_date DATE NOT NULL,
    assigned_worker VARCHAR(100) NULL,
    completion_status ENUM('Pending', 'In Progress', 'Completed') NOT NULL DEFAULT 'Pending',
    completed_date DATE NULL,
    cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS security_handover (
    handover_id INT AUTO_INCREMENT PRIMARY KEY,
    hostel_code ENUM('GH1', 'GH2', 'BH1', 'BH2') NOT NULL,
    handover_date DATE NOT NULL,
    shift ENUM('Morning (06:00 - 14:00)', 'Evening (14:00 - 22:00)', 'Night (22:00 - 06:00)') NOT NULL,
    outgoing_guard VARCHAR(100) NOT NULL,
    incoming_guard VARCHAR(100) NOT NULL,
    keys_status VARCHAR(200) NOT NULL DEFAULT 'All room & gate keys accounted for',
    incident_summary TEXT NULL,
    verified_by_warden BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Mess_Weekly_Menu (
    menu_id INT AUTO_INCREMENT PRIMARY KEY,
    day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
    meal_type ENUM('Breakfast', 'Lunch', 'Evening Snacks', 'Dinner') NOT NULL,
    menu_items TEXT NULL,
    meal_timing VARCHAR(100) NULL,
    is_configured BOOLEAN NOT NULL DEFAULT FALSE,
    last_updated_by VARCHAR(100) NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_day_meal UNIQUE (day_of_week, meal_type)
) ENGINE=InnoDB;

SELECT 'Migration to JKLU Hostel Management System schema completed successfully.' AS status;
