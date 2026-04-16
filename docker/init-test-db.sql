-- Create test database and enable PostGIS on both databases
CREATE DATABASE wisr_test;

\c wisr
CREATE EXTENSION IF NOT EXISTS postgis;

\c wisr_test
CREATE EXTENSION IF NOT EXISTS postgis;
