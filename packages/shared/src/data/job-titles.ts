/**
 * Comprehensive tech job titles organized by category and seniority.
 * Used by the Compare page to give the LLM a target role for evaluation.
 */

export type JobSeniority = 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Principal' | 'Staff' | 'Director' | 'VP'

export interface JobTitle {
  id: string
  title: string
  category: string
  seniority: JobSeniority
  aliases?: string[]
}

const SENIORITY_LEVELS: JobSeniority[] = [
  'Junior',
  'Mid',
  'Senior',
  'Lead',
  'Principal',
  'Staff',
  'Director',
]

// Categories with base titles
const BASE_TITLES: Record<string, string[]> = {
  'Backend': [
    'Backend Developer',
    'Backend Engineer',
    'Software Engineer',
    'Server-Side Developer',
    'API Developer',
    'Platform Engineer',
    'Systems Engineer',
    'Distributed Systems Engineer',
    'Microservices Engineer',
  ],
  'Frontend': [
    'Frontend Developer',
    'Frontend Engineer',
    'UI Engineer',
    'Web Developer',
    'JavaScript Developer',
    'React Developer',
    'Vue Developer',
    'Angular Developer',
    'UI/UX Engineer',
  ],
  'Full-Stack': [
    'Full-Stack Developer',
    'Full-Stack Engineer',
    'Software Developer',
    'Web Application Developer',
    'Product Engineer',
    'Polyglot Developer',
  ],
  'Data': [
    'Data Engineer',
    'Data Analyst',
    'Data Scientist',
    'Analytics Engineer',
    'BI Developer',
    'Database Administrator',
    'Data Architect',
    'ETL Developer',
    'Data Platform Engineer',
    'Machine Learning Engineer',
    'AI Engineer',
    'MLOps Engineer',
    'Deep Learning Engineer',
    'NLP Engineer',
    'Computer Vision Engineer',
    'Research Scientist',
    'Applied Scientist',
  ],
  'DevOps & Cloud': [
    'DevOps Engineer',
    'Site Reliability Engineer',
    'Cloud Engineer',
    'Platform Engineer',
    'Infrastructure Engineer',
    'Cloud Architect',
    'Cloud Security Engineer',
    'Systems Administrator',
    'Build and Release Engineer',
    'Release Manager',
    'Automation Engineer',
  ],
  'Mobile': [
    'Mobile Developer',
    'iOS Developer',
    'Android Developer',
    'React Native Developer',
    'Flutter Developer',
    'Mobile Engineer',
    'Mobile Architect',
  ],
  'QA & Testing': [
    'QA Engineer',
    'QA Analyst',
    'Test Engineer',
    'Automation Engineer',
    'SDET',
    'QA Lead',
    'Test Architect',
    'Performance Engineer',
    'Security Tester',
  ],
  'Security': [
    'Security Engineer',
    'Security Analyst',
    'Penetration Tester',
    'Application Security Engineer',
    'Security Architect',
    'SOC Analyst',
    'Threat Intelligence Analyst',
    'Incident Responder',
    'Cryptographer',
    'Compliance Analyst',
  ],
  'Architecture': [
    'Software Architect',
    'Solutions Architect',
    'Enterprise Architect',
    'Technical Architect',
    'Systems Architect',
    'Data Architect',
    'Cloud Architect',
    'Security Architect',
  ],
  'Product': [
    'Product Manager',
    'Product Owner',
    'Technical Product Manager',
    'Product Analyst',
    'Product Lead',
    'Group Product Manager',
    'Director of Product',
    'VP of Product',
  ],
  'Design': [
    'UI Designer',
    'UX Designer',
    'Product Designer',
    'UX Researcher',
    'Interaction Designer',
    'Visual Designer',
    'Design System Designer',
    'Design Lead',
    'Creative Director',
  ],
  'Engineering Management': [
    'Engineering Manager',
    'Director of Engineering',
    'VP of Engineering',
    'CTO',
    'Head of Engineering',
    'Team Lead',
    'Tech Lead',
    'Development Manager',
  ],
  'Blockchain': [
    'Blockchain Developer',
    'Smart Contract Developer',
    'Web3 Developer',
    'Blockchain Engineer',
    'Solidity Developer',
    'Protocol Engineer',
    'Blockchain Architect',
  ],
  'Embedded & IoT': [
    'Embedded Engineer',
    'Firmware Engineer',
    'IoT Engineer',
    'Systems Programmer',
    'Embedded Software Engineer',
    'Hardware Engineer',
    'Robotics Engineer',
  ],
  'Game Development': [
    'Game Developer',
    'Game Programmer',
    'Game Engineer',
    'Game Designer',
    'Graphics Programmer',
    'Technical Artist',
    'Gameplay Engineer',
  ],
  'Networking': [
    'Network Engineer',
    'Network Administrator',
    'Network Architect',
    'Network Security Engineer',
    'NOC Engineer',
    'Telecom Engineer',
  ],
  'Database': [
    'Database Administrator',
    'Database Engineer',
    'Database Architect',
    'Database Developer',
    'SQL Developer',
    'PostgreSQL DBA',
    'Oracle DBA',
    'NoSQL Specialist',
  ],
  'AI Research': [
    'AI Researcher',
    'ML Researcher',
    'Research Engineer',
    'Research Scientist',
    'AI Ethics Researcher',
    'AI Product Manager',
  ],
  'Technical Writing': [
    'Technical Writer',
    'Documentation Engineer',
    'API Writer',
    'Developer Advocate',
    'Technical Content Writer',
  ],
  'Support & Solutions': [
    'Solutions Engineer',
    'Sales Engineer',
    'Technical Support Engineer',
    'Customer Success Engineer',
    'Implementation Engineer',
    'Solutions Consultant',
    'Pre-Sales Engineer',
    'Technical Account Manager',
  ],
  'IT & Infrastructure': [
    'IT Support Specialist',
    'IT Administrator',
    'Systems Administrator',
    'IT Manager',
    'IT Director',
    'Infrastructure Manager',
    'Help Desk Technician',
  ],
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export const JOB_TITLES: JobTitle[] = []

// Generate all combinations (title × seniority)
for (const [category, titles] of Object.entries(BASE_TITLES)) {
  for (const title of titles) {
    for (const seniority of SENIORITY_LEVELS) {
      JOB_TITLES.push({
        id: slugify(`${seniority}-${title}`),
        title: `${seniority} ${title}`,
        category,
        seniority,
      })
    }
  }
}

// Also add base titles (without seniority prefix) as a generic option
for (const [category, titles] of Object.entries(BASE_TITLES)) {
  for (const title of titles) {
    JOB_TITLES.push({
      id: slugify(title),
      title,
      category,
      seniority: 'Mid' as JobSeniority,
      aliases: [`${title} (any level)`],
    })
  }
}

// Sort for display
JOB_TITLES.sort((a, b) => {
  if (a.category !== b.category) return a.category.localeCompare(b.category)
  if (a.seniority !== b.seniority) {
    const order = SENIORITY_LEVELS.indexOf(a.seniority) - SENIORITY_LEVELS.indexOf(b.seniority)
    if (order !== 0) return order
  }
  return a.title.localeCompare(b.title)
})

export const JOB_CATEGORIES = Object.keys(BASE_TITLES)

export const SENIORITY_OPTIONS: JobSeniority[] = SENIORITY_LEVELS