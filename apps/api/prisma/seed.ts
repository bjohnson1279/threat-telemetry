import { PrismaClient } from '@prisma/client';
import { generateId } from '@threat-telemetry/shared';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing data...');
  await prisma.threatIndicator.deleteMany({});

  const mockIndicators = [
    {
      indicatorValue: '192.168.1.100',
      indicatorType: 'IP',
      severity: 'HIGH',
      confidenceScore: 85,
      enrichmentSummary: 'Known malicious IP associated with command and control servers.',
      mitreTechniques: ['T1566', 'T1059'],
      rawPayload: { source: 'honeypot', hits: 45 },
    },
    {
      indicatorValue: 'malicious-domain.com',
      indicatorType: 'DOMAIN',
      severity: 'CRITICAL',
      confidenceScore: 98,
      enrichmentSummary: 'Domain linked to recent ransomware campaigns.',
      mitreTechniques: ['T1486', 'T1071'],
      rawPayload: { source: 'threat-intel-feed' },
    },
    {
      indicatorValue: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      indicatorType: 'SHA256',
      severity: 'MEDIUM',
      confidenceScore: 60,
      enrichmentSummary: 'Suspicious executable hash found in phishing emails.',
      mitreTechniques: ['T1566'],
      rawPayload: { file_name: 'invoice.pdf.exe' },
    },
    {
      indicatorValue: 'http://evil.com/payload.bin',
      indicatorType: 'URL',
      severity: 'HIGH',
      confidenceScore: 90,
      enrichmentSummary: 'URL distributing known malware payloads.',
      mitreTechniques: ['T1190'],
      rawPayload: { connection: 'http' },
    },
    {
      indicatorValue: 'CVE-2021-44228',
      indicatorType: 'CVE',
      severity: 'CRITICAL',
      confidenceScore: 100,
      enrichmentSummary: 'Log4Shell vulnerability, active exploitation observed.',
      mitreTechniques: ['T1190', 'T1059'],
      rawPayload: { cvss: 10 },
    },
    {
      indicatorValue: '10.0.0.55',
      indicatorType: 'IP',
      severity: 'LOW',
      confidenceScore: 20,
      enrichmentSummary: 'Internal IP scanning activity observed.',
      mitreTechniques: ['T1046'],
      rawPayload: { protocol: 'tcp' },
    },
    {
      indicatorValue: 'suspicious-login.biz',
      indicatorType: 'DOMAIN',
      severity: 'MEDIUM',
      confidenceScore: 50,
      enrichmentSummary: 'Newly registered domain resembling internal login pages.',
      mitreTechniques: ['T1566', 'T1078'],
      rawPayload: { registrar: 'cheap-domains' },
    },
    {
      indicatorValue: 'user_admin',
      indicatorType: 'USERNAME',
      severity: 'LOW',
      confidenceScore: 15,
      enrichmentSummary: 'Failed login attempts for default admin user.',
      mitreTechniques: ['T1110'],
      rawPayload: { count: 50 },
    },
    {
      indicatorValue: 'f2ca1bb6c7e907d06dafe4687e579fce76b37e4e93b7605022da52e6ccc26fd2',
      indicatorType: 'SHA256',
      severity: 'HIGH',
      confidenceScore: 80,
      enrichmentSummary: 'Trojan downloader associated with known threat actors.',
      mitreTechniques: ['T1059'],
      rawPayload: { size: 1024500 },
    },
    {
      indicatorValue: 'https://legit-site.com/hidden/shell.php',
      indicatorType: 'URL',
      severity: 'CRITICAL',
      confidenceScore: 95,
      enrichmentSummary: 'Web shell identified on compromised legitimate infrastructure.',
      mitreTechniques: ['T1505'],
      rawPayload: { status: 200 },
    },
    {
      indicatorValue: '8.8.8.8',
      indicatorType: 'IP',
      severity: 'LOW',
      confidenceScore: 5,
      enrichmentSummary: 'Public DNS resolver, low risk.',
      mitreTechniques: [],
      rawPayload: { type: 'dns' },
    },
    {
      indicatorValue: 'malware-distribution.net',
      indicatorType: 'DOMAIN',
      severity: 'HIGH',
      confidenceScore: 88,
      enrichmentSummary: 'Known malware distribution network domain.',
      mitreTechniques: ['T1071'],
      rawPayload: { category: 'malware' },
    },
    {
      indicatorValue: 'CVE-2023-23397',
      indicatorType: 'CVE',
      severity: 'CRITICAL',
      confidenceScore: 92,
      enrichmentSummary: 'Outlook Elevation of Privilege Vulnerability.',
      mitreTechniques: ['T1190'],
      rawPayload: { patch_status: 'unpatched' },
    },
    {
      indicatorValue: '172.16.0.10',
      indicatorType: 'IP',
      severity: 'MEDIUM',
      confidenceScore: 65,
      enrichmentSummary: 'Suspicious lateral movement activity detected.',
      mitreTechniques: ['T1078', 'T1053'],
      rawPayload: { user: 'guest' },
    },
    {
      indicatorValue: 'd41d8cd98f00b204e9800998ecf8427e',
      indicatorType: 'MD5',
      severity: 'LOW',
      confidenceScore: 10,
      enrichmentSummary: 'Empty file hash, likely benign.',
      mitreTechniques: [],
      rawPayload: { file_type: 'empty' },
    },
    {
      indicatorValue: 'ftp://ftp.anonymous.com',
      indicatorType: 'URL',
      severity: 'MEDIUM',
      confidenceScore: 40,
      enrichmentSummary: 'Anonymous FTP server accessed from sensitive network segment.',
      mitreTechniques: ['T1043'],
      rawPayload: { protocol: 'ftp' },
    },
    {
      indicatorValue: 'bad-actor@protonmail.com',
      indicatorType: 'EMAIL',
      severity: 'HIGH',
      confidenceScore: 75,
      enrichmentSummary: 'Email address associated with targeted phishing campaigns.',
      mitreTechniques: ['T1566'],
      rawPayload: { subject: 'Urgent Invoice' },
    },
    {
      indicatorValue: 'CVE-2017-0144',
      indicatorType: 'CVE',
      severity: 'HIGH',
      confidenceScore: 85,
      enrichmentSummary: 'EternalBlue vulnerability, commonly used for lateral movement.',
      mitreTechniques: ['T1210'],
      rawPayload: { exploit_kit: 'NSA' },
    },
    {
      indicatorValue: '203.0.113.50',
      indicatorType: 'IP',
      severity: 'MEDIUM',
      confidenceScore: 55,
      enrichmentSummary: 'IP showing signs of port scanning activity.',
      mitreTechniques: ['T1046'],
      rawPayload: { ports: [22, 80, 443] },
    },
    {
      indicatorValue: 'free-software-download.info',
      indicatorType: 'DOMAIN',
      severity: 'HIGH',
      confidenceScore: 82,
      enrichmentSummary: 'Domain hosting potentially unwanted programs and spyware.',
      mitreTechniques: ['T1071'],
      rawPayload: { host: 'shared' },
    },
    {
      indicatorValue: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      indicatorType: 'SHA256',
      severity: 'CRITICAL',
      confidenceScore: 99,
      enrichmentSummary: 'Cryptominer payload, highly active.',
      mitreTechniques: ['T1496'],
      rawPayload: { os: 'linux' },
    },
    {
      indicatorValue: 'http://update.server.local/patch',
      indicatorType: 'URL',
      severity: 'LOW',
      confidenceScore: 5,
      enrichmentSummary: 'Legitimate internal update server.',
      mitreTechniques: [],
      rawPayload: { internal: true },
    },
    {
      indicatorValue: 'root',
      indicatorType: 'USERNAME',
      severity: 'MEDIUM',
      confidenceScore: 60,
      enrichmentSummary: 'Brute force attempts on root account via SSH.',
      mitreTechniques: ['T1110'],
      rawPayload: { protocol: 'ssh' },
    },
    {
      indicatorValue: 'CVE-2020-1472',
      indicatorType: 'CVE',
      severity: 'CRITICAL',
      confidenceScore: 96,
      enrichmentSummary: 'Zerologon vulnerability, extreme risk if unpatched.',
      mitreTechniques: ['T1068', 'T1078'],
      rawPayload: { service: 'netlogon' },
    },
    {
      indicatorValue: '198.51.100.22',
      indicatorType: 'IP',
      severity: 'HIGH',
      confidenceScore: 78,
      enrichmentSummary: 'IP used as proxy for malicious traffic.',
      mitreTechniques: ['T1090'],
      rawPayload: { proxy_type: 'socks5' },
    },
    {
      indicatorValue: 'phishing-login-page.com',
      indicatorType: 'DOMAIN',
      severity: 'CRITICAL',
      confidenceScore: 94,
      enrichmentSummary: 'Active credential harvesting domain.',
      mitreTechniques: ['T1566'],
      rawPayload: { targeted_brand: 'Microsoft' },
    },
    {
      indicatorValue: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      indicatorType: 'SHA256',
      severity: 'MEDIUM',
      confidenceScore: 66,
      enrichmentSummary: 'Adware installer.',
      mitreTechniques: ['T1059'],
      rawPayload: { detection_rate: 0.4 },
    }
  ];

  console.log(`Inserting ${mockIndicators.length} mock indicators...`);
  
  await prisma.threatIndicator.createMany({
    data: mockIndicators.map(ind => ({
      ...ind,
      firstSeen: new Date(Date.now() - Math.random() * 10000000000),
      lastSeen: new Date(),
    })),
  });

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
