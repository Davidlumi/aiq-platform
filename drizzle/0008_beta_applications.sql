-- Migration 0008: Beta Applications
-- Creates the beta_applications table for company-level beta programme applications.
-- Eligibility requirement: hr_team_size >= 10

CREATE TABLE IF NOT EXISTS `beta_applications` (
  `id`                  INT          NOT NULL AUTO_INCREMENT,
  `contact_first_name`  VARCHAR(100) NOT NULL,
  `contact_last_name`   VARCHAR(100) NOT NULL,
  `contact_email`       VARCHAR(255) NOT NULL,
  `contact_title`       VARCHAR(150) NOT NULL,
  `company_name`        VARCHAR(200) NOT NULL,
  `sector`              VARCHAR(100) NOT NULL,
  `company_size`        VARCHAR(50)  NOT NULL,
  `hr_team_size`        INT          NOT NULL,
  `use_case`            TEXT         NOT NULL,
  `current_ai_tools`    TEXT,
  `motivation`          TEXT         NOT NULL,
  `linkedin_url`        VARCHAR(500),
  `status`              VARCHAR(30)  NOT NULL DEFAULT 'pending',
  `notes`               TEXT,
  `created_at`          INT          NOT NULL,
  `updated_at`          INT          NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_beta_contact_email` (`contact_email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Seed: 10 realistic company beta applications ────────────────────────────
-- Mix of statuses: approved (3), pending (5), waitlisted (2)
-- All have hr_team_size >= 10

INSERT INTO `beta_applications`
  (`contact_first_name`, `contact_last_name`, `contact_email`, `contact_title`,
   `company_name`, `sector`, `company_size`, `hr_team_size`,
   `use_case`, `current_ai_tools`, `motivation`,
   `linkedin_url`, `status`, `notes`, `created_at`, `updated_at`)
VALUES
  -- 1. Approved
  ('Sarah', 'Thornton', 'sarah.thornton@meridiangroup.co.uk', 'Chief People Officer',
   'Meridian Group', 'Financial Services', '1001-5000', 42,
   'We want to assess our HR team''s readiness before rolling out Copilot for HR workflows. We have 42 HR professionals across three business units and need a credible baseline before we invest in upskilling.',
   'Microsoft Copilot (pilot), ChatGPT Enterprise',
   'We''ve had two near-misses where HR advisors accepted AI-generated ER advice without checking it. We need a structured way to identify who is ready and who needs support before we scale.',
   'https://linkedin.com/in/sarah-thornton-cpo', 'approved',
   'Strong use case, clear governance concern, CPO sponsorship. Priority cohort.', 1745000000, 1745000000),

  -- 2. Approved
  ('James', 'Okafor', 'james.okafor@vertexretail.com', 'Head of People Analytics',
   'Vertex Retail', 'Retail', '5001-10000', 28,
   'Our HR Ops team of 28 is using AI tools inconsistently. Some are highly proficient, others are using AI to draft disciplinary letters without review. We need to map capability gaps before our Q3 AI governance audit.',
   'Workday AI, ChatGPT, Notion AI',
   'The board has asked for evidence that our HR function is using AI responsibly. AiQ gives us the data to demonstrate that.',
   'https://linkedin.com/in/james-okafor-analytics', 'approved',
   'Analytics-led HR team, board mandate. Excellent fit for capability mapping use case.', 1744900000, 1744900000),

  -- 3. Approved
  ('Priya', 'Mehta', 'priya.mehta@novacarehealth.org', 'Director of HR Transformation',
   'NovaCare Health', 'Healthcare', '10001-50000', 85,
   'We are deploying an AI-assisted triage tool for HR case management across 85 HR business partners and advisors. We need to assess readiness before go-live and identify who needs targeted development.',
   'ServiceNow AI, internal LLM tool (in development)',
   'Patient safety concerns mean we cannot afford HR professionals making AI-assisted decisions without proper judgement. AiQ''s governance and appropriateness dimensions are exactly what we need.',
   NULL, 'approved',
   'Healthcare context adds urgency. 85-person HR team is our largest beta cohort. Governance sensitivity is critical.', 1744800000, 1744800000),

  -- 4. Pending
  ('Marcus', 'Webb', 'marcus.webb@bridgestoneconsulting.com', 'People Director',
   'Bridgestone Consulting', 'Professional Services', '501-1000', 14,
   'We are a management consultancy with 14 HR professionals. We advise clients on AI adoption and want to ensure our own HR team is credibly assessed before we recommend AiQ to clients.',
   'Claude, Perplexity, internal knowledge base',
   'We want to walk the talk. If we''re advising clients to assess AI readiness, we should be doing it ourselves first.',
   'https://linkedin.com/in/marcus-webb-pd', 'pending',
   NULL, 1745100000, 1745100000),

  -- 5. Pending
  ('Fatima', 'Al-Rashid', 'fatima.alrashid@globallogisticsco.ae', 'VP People & Culture',
   'Global Logistics Co', 'Logistics & Supply Chain', '1001-5000', 22,
   'We have 22 HR professionals across UAE, KSA, and Egypt. AI tools are being adopted at different rates across regions. We want to understand capability variance and build a consistent baseline.',
   'ChatGPT, Gemini, local Arabic LLM tools',
   'Regional variance in AI adoption is creating inconsistency in HR quality. We need a structured assessment to identify where to focus development investment.',
   NULL, 'pending',
   NULL, 1745050000, 1745050000),

  -- 6. Pending
  ('Tom', 'Hargreaves', 'tom.hargreaves@castlefordmanufacturing.co.uk', 'HR Director',
   'Castleford Manufacturing', 'Manufacturing', '1001-5000', 18,
   'Our HR team of 18 is under pressure to adopt AI tools as part of a wider digital transformation. We want to assess readiness before mandating tool adoption and avoid the risk of poor AI use in sensitive HR decisions.',
   'None currently — evaluating options',
   'We are at the start of our AI journey. AiQ would give us a credible starting point and help us make the case for investment in HR AI capability.',
   'https://linkedin.com/in/tom-hargreaves-hrd', 'pending',
   NULL, 1745020000, 1745020000),

  -- 7. Pending
  ('Anika', 'Sorensen', 'anika.sorensen@nordicfintech.io', 'Chief HR Officer',
   'Nordic Fintech', 'Financial Technology', '201-500', 11,
   'We are a scale-up with 11 HR professionals. We are about to deploy an AI-powered recruitment screening tool and want to ensure our team understands the ethical and governance implications before go-live.',
   'Greenhouse AI, ChatGPT',
   'We have GDPR and AI Act obligations. We need to demonstrate that our HR team has been assessed for AI readiness as part of our compliance documentation.',
   'https://linkedin.com/in/anika-sorensen-chro', 'pending',
   'AI Act compliance angle is compelling. Small but high-quality team.', 1744950000, 1744950000),

  -- 8. Pending
  ('David', 'Okonkwo', 'david.okonkwo@panafricanbank.com', 'Group Head of HR',
   'Pan-African Bank', 'Banking', '5001-10000', 67,
   'We have 67 HR professionals across 12 African markets. AI adoption is patchy and we have no visibility of capability levels. We want to use AiQ to build a group-wide capability map before our 2026 HR technology investment.',
   'Microsoft Copilot, local AI tools vary by market',
   'Group-wide consistency is our biggest challenge. AiQ would give us a common language and measurement framework for AI capability across all markets.',
   NULL, 'pending',
   NULL, 1744980000, 1744980000),

  -- 9. Waitlisted
  ('Claire', 'Beaumont', 'claire.beaumont@luxuryretailgroup.fr', 'DRH / HR Director',
   'Luxury Retail Group', 'Luxury Retail', '1001-5000', 16,
   'We have 16 HR professionals across France, Italy, and the UK. We are exploring AI tools for talent acquisition and want to assess readiness before piloting.',
   'LinkedIn Talent Insights, ChatGPT',
   'We want to ensure our HR team is ready before we invest in AI tools. AiQ would help us identify gaps and prioritise training.',
   'https://linkedin.com/in/claire-beaumont-drh', 'waitlisted',
   'Good fit but limited use case specificity. Waitlisted pending capacity.', 1744700000, 1744700000),

  -- 10. Waitlisted
  ('Ravi', 'Krishnamurthy', 'ravi.krishnamurthy@techinfra.in', 'Head of HR Operations',
   'TechInfra Solutions', 'IT Services', '1001-5000', 31,
   'We have 31 HR professionals in India and Singapore. We are rolling out an AI-assisted performance management tool and want to assess HR team readiness before the pilot.',
   'Darwinbox AI, ChatGPT',
   'Performance management is a high-stakes area. We want to ensure our HR team can critically evaluate AI outputs before they influence decisions.',
   NULL, 'waitlisted',
   'Strong use case. Waitlisted due to current cohort capacity.', 1744750000, 1744750000);
