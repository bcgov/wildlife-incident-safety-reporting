-- Create test database and enable PostGIS on both databases
CREATE DATABASE wars_test;

\c wars
CREATE EXTENSION IF NOT EXISTS postgis;

\c wars_test
CREATE EXTENSION IF NOT EXISTS postgis;
