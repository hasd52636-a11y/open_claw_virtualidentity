import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import CryptoJS from "crypto-js";
import cors from "cors";
import OpenAI from 'openai';
import { API_CONFIG, hashKeyManager, validateApiKey, generateContentHash } from './API/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// NVIDIA API configuration
const openai = new OpenAI({
  apiKey: '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',
  baseURL: 'https://integrate.api.nvidia.com/v1'
});

const db = new Database("identity.db");

// Initialize Database with Blockchain support
db.exec(`
  CREATE TABLE IF NOT EXISTS real_emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'active'
  );

  CREATE TABLE IF NOT EXISTS generation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    country TEXT,
    full_name TEXT,
    gender TEXT,
    birth_date TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    occupation TEXT,
    national_id TEXT,
    passport_number TEXT,
    credit_card TEXT,
    bank_account TEXT,
    avatar_url TEXT,
    lifestyle_url TEXT,
    blockchain_hash TEXT UNIQUE,
    previous_hash TEXT,
    watermark TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Safely add columns if they don't exist (for existing DB)
try { db.exec("ALTER TABLE generation_history ADD COLUMN national_id TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE generation_history ADD COLUMN passport_number TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE generation_history ADD COLUMN credit_card TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE generation_history ADD COLUMN bank_account TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE generation_history ADD COLUMN watermark TEXT"); } catch (e) {}

// Seed some "real" emails if empty
const emailCount = db.prepare("SELECT COUNT(*) as count FROM real_emails").get() as { count: number };
if (emailCount.count === 0) {
  const seedEmails = [
    "test.user.01@gmail.com",
    "dev.tester.alpha@outlook.com",
    "qa.engineer.pro@yahoo.com",
    "identity.verify.01@protonmail.com",
    "sandbox.user.99@icloud.com"
  ];
  const insertEmail = db.prepare("INSERT INTO real_emails (email) VALUES (?)");
  seedEmails.forEach(email => insertEmail.run(email));
}

// Function to generate identity details using NVIDIA API
async function generateIdentityWithNVIDIA(country: string, lang: string) {
  try {
    let countrySpecificRules = '';
    let countrySpecificExamples = '';
    
    // Country-specific generation rules and examples
    switch (country) {
      case 'CN':
        countrySpecificRules = `
- Full name: Use Chinese characters, format: Surname + Given name (e.g., 张三, 李四)
- Address: Use Chinese format: Province + City + District + Street + Building + Room (e.g., 北京市朝阳区建国路88号)
- Phone number: Format: 1[3-9]xxxxxxxx (11 digits)
- National ID: 18 digits, last digit can be X
- Email: Use pinyin for Chinese names, no Chinese characters
- Occupation: Use Chinese terms (e.g., 工程师, 教师)
- Company name: Use Chinese company names (e.g., 科技有限公司, 教育机构)
`;
        countrySpecificExamples = `
Example:
{
  "fullName": "王强",
  "gender": "Male",
  "birthDate": "1985-06-15",
  "address": "上海市浦东新区张江高科技园区博云路2号",
  "street": "博云路",
  "city": "上海市",
  "state": "Shanghai",
  "stateFullName": "上海市",
  "zipCode": "201203",
  "phone": "13812345678",
  "email": "wangqiang123@gmail.com",
  "occupation": "软件工程师",
  "nationalId": "310101198506151234",
  "companyName": "上海科技有限公司"
}`;
        break;
      case 'US':
        countrySpecificRules = `
- Full name: First name + Last name (e.g., John Smith, Jane Doe)
- Address: Format: Street number + Street name, City, State Abbreviation, Zip code
- Phone number: Format: (XXX) XXX-XXXX
- National ID: SSN format: XXX-XX-XXXX
- Email: First name + last name or initials
- Occupation: Use English terms (e.g., Engineer, Teacher)
- Company name: Use American company names (e.g., Tech Corp, Global Industries)
`;
        countrySpecificExamples = `
Example:
{
  "fullName": "John Smith",
  "gender": "Male",
  "birthDate": "1982-03-20",
  "address": "123 Main St, New York, NY 10001",
  "street": "123 Main St",
  "city": "New York",
  "state": "NY",
  "stateFullName": "New York",
  "zipCode": "10001",
  "phone": "(212) 555-1234",
  "email": "john.smith@example.com",
  "occupation": "Software Engineer",
  "nationalId": "123-45-6789",
  "companyName": "Tech Innovations Inc."
}`;
        break;
      case 'JP':
        countrySpecificRules = `
- Full name: Use Japanese characters, format: Surname + Given name (e.g., 佐藤太郎, 鈴木花子)
- Address: Use Japanese format: Prefecture + City + Ward + Street + Building + Room (e.g., 東京都渋谷区神南1-10-10)
- Phone number: Format: 0[3-9]xxxx-xxxx
- National ID: 12 digits
- Email: Use romaji for Japanese names, no Japanese characters
- Occupation: Use Japanese terms (e.g., エンジニア, 教師)
- Company name: Use Japanese company names (e.g., 株式会社テクノロジー, 教育法人)
`;
        countrySpecificExamples = `
Example:
{
  "fullName": "佐藤大辅",
  "gender": "Male",
  "birthDate": "1987-08-05",
  "address": "東京都渋谷区神南1-10-10 ビル101号室",
  "street": "神南1-10-10",
  "city": "東京都",
  "state": "Tokyo",
  "stateFullName": "東京都",
  "zipCode": "150-0041",
  "phone": "03-1234-5678",
  "email": "satodaisuke@example.com",
  "occupation": "ソフトウェアエンジニア",
  "nationalId": "123456789012",
  "companyName": "株式会社テクノ"
}`;
        break;
      case 'GB':
        countrySpecificRules = `
- Full name: First name + Last name (e.g., James Wilson, Emma Taylor)
- Address: Format: House number + Street name, City, Postcode (e.g., 123 High Street, London, SW1A 1AA)
- Phone number: Format: +44 XX XXXX XXXX
- National ID: UK National Insurance number format: XX XX XX XX
- Email: First name + last name or initials
- Occupation: Use British English terms (e.g., Engineer, Teacher)
- Company name: Use British company names (e.g., Tech Ltd, Global Industries PLC)
`;
        countrySpecificExamples = `
Example:
{
  "fullName": "James Wilson",
  "gender": "Male",
  "birthDate": "1984-11-10",
  "address": "123 High Street, London, SW1A 1AA",
  "street": "123 High Street",
  "city": "London",
  "state": "England",
  "stateFullName": "England",
  "zipCode": "SW1A 1AA",
  "phone": "+44 20 1234 5678",
  "email": "james.wilson@example.com",
  "occupation": "Software Engineer",
  "nationalId": "AB 12 34 56",
  "companyName": "Tech Solutions Ltd"
}`;
        break;
      case 'DE':
        countrySpecificRules = `
- Full name: First name + Last name (e.g., Max Müller, Anna Schmidt)
- Address: Format: House number + Street name, Postcode City, Germany (e.g., 123 Hauptstraße, 10115 Berlin, Germany)
- Phone number: Format: +49 XX XXXX XXXX
- National ID: German ID card number format: XX.XXX.XXX.X
- Email: First name + last name or initials
- Occupation: Use German terms (e.g., Ingenieur, Lehrer)
- Company name: Use German company names (e.g., Technik GmbH, Global Industrie GmbH)
`;
        countrySpecificExamples = `
Example:
{
  "fullName": "Max Müller",
  "gender": "Male",
  "birthDate": "1986-02-18",
  "address": "123 Hauptstraße, 10115 Berlin, Germany",
  "street": "123 Hauptstraße",
  "city": "Berlin",
  "state": "Berlin",
  "stateFullName": "Berlin",
  "zipCode": "10115",
  "phone": "+49 30 1234 5678",
  "email": "max.mueller@example.com",
  "occupation": "Ingenieur",
  "nationalId": "AB.123.456.7",
  "companyName": "Technik GmbH"
}`;
        break;
      case 'FR':
        countrySpecificRules = `
- Full name: First name + Last name (e.g., Jean Dupont, Marie Martin)
- Address: Format: House number + Street name, Postcode City, France (e.g., 123 Rue de la République, 75001 Paris, France)
- Phone number: Format: +33 X XX XX XX XX
- National ID: French ID card number format: XX XXX XXX XX
- Email: First name + last name or initials
- Occupation: Use French terms (e.g., Ingénieur, Enseignant)
- Company name: Use French company names (e.g., Tech Société, Industries Globales)
`;
        countrySpecificExamples = `
Example:
{
  "fullName": "Jean Dupont",
  "gender": "Male",
  "birthDate": "1983-07-22",
  "address": "123 Rue de la République, 75001 Paris, France",
  "street": "123 Rue de la République",
  "city": "Paris",
  "state": "Île-de-France",
  "stateFullName": "Île-de-France",
  "zipCode": "75001",
  "phone": "+33 1 23 45 67 89",
  "email": "jean.dupont@example.com",
  "occupation": "Ingénieur",
  "nationalId": "AB 123 456 78",
  "companyName": "Tech Société"
}`;
        break;
      default:
        countrySpecificRules = `
- Full name: Culturally appropriate for the country
- Address: Format specific to the country
- Phone number: Format specific to the country
- National ID: Format specific to the country
- Email: No non-English characters
- Occupation: Use terms appropriate for the country
- Company name: Use company names appropriate for the country
`;
        break;
    }
    
    const prompt = `Generate realistic identity details for a ${country === 'CN' ? 'Chinese' : country === 'US' ? 'American' : 'person from'} ${country}. Include the following fields:
1. Full name (culturally appropriate for the country)
2. Gender (randomly male or female)
3. Birth date (between 1970 and 2000)
4. Address (specific to the country)
5. Street address
6. City
7. State (if applicable)
8. State full name (if applicable)
9. Zip code (if applicable)
10. County (if applicable)
11. Phone number (in the country's format)
12. Email address (no non-English characters)
13. Occupation (culturally appropriate for the country)
14. Company name (culturally appropriate for the country)
15. Company size
16. Employment status
17. Monthly salary (in local currency)
18. National ID (in the country's format)
19. Passport number (following ICAO standards)
20. Credit card details (valid format, including type)
21. Bank account number (valid format)
22. Hair color
23. Height (in both feet/inches and centimeters)
24. Weight (in both pounds and kilograms)
25. Blood type
26. Username
27. Password
28. Operating system
29. GUID
30. Browser user agent
31. Education background
32. Personal website
33. Security question
34. Security answer

${countrySpecificRules}

${countrySpecificExamples}

Return the data as a JSON object with the following structure:
{
  "fullName": "",
  "gender": "",
  "birthDate": "",
  "address": "",
  "street": "",
  "city": "",
  "state": "",
  "stateFullName": "",
  "zipCode": "",
  "county": "",
  "phone": "",
  "email": "",
  "occupation": "",
  "companyName": "",
  "companySize": "",
  "employmentStatus": "",
  "monthlySalary": "",
  "nationalId": "",
  "passportNumber": "",
  "creditCard": {
    "number": "",
    "expiry": "",
    "cvv": "",
    "type": ""
  },
  "bankAccount": "",
  "hairColor": "",
  "height": "",
  "weight": "",
  "bloodType": "",
  "username": "",
  "password": "",
  "operatingSystem": "",
  "guid": "",
  "userAgent": "",
  "education": "",
  "personalWebsite": "",
  "securityQuestion": "",
  "securityAnswer": ""
}`;

    const completion = await openai.chat.completions.create({
      model: "deepseek-ai/deepseek-v3.1",
      messages: [{"role":"user","content":prompt}],
      temperature: 0.2,
      top_p: 0.7,
      max_tokens: 8192,
      stream: false
    });

    const response = completion.choices[0]?.message?.content;
    if (response) {
      // Extract JSON from response, handling code blocks
      let jsonString = response;
      
      // Remove markdown code block wrappers if present
      if (jsonString.startsWith('```json') && jsonString.endsWith('```')) {
        jsonString = jsonString.substring(7, jsonString.length - 3).trim();
      } else if (jsonString.startsWith('```') && jsonString.endsWith('```')) {
        jsonString = jsonString.substring(3, jsonString.length - 3).trim();
      }
      
      try {
        const identity = JSON.parse(jsonString);
        return identity;
      } catch (e) {
        console.error("JSON parsing error:", e);
        console.error("Response content:", response);
      }
    }
  } catch (error) {
    console.error("NVIDIA API error:", error);
  }
  return null;
}

// Country to primary language mapping
const COUNTRY_LANGUAGES: Record<string, string> = {
  CN: 'zh',     // China - Chinese
  JP: 'ja',     // Japan - Japanese
  KR: 'ko',     // Korea - Korean
  US: 'en',     // United States - English
  GB: 'en',     // United Kingdom - English
  DE: 'de',     // Germany - German
  FR: 'fr',     // France - French
  ES: 'es',     // Spain - Spanish
  RU: 'ru',     // Russia - Russian
  IN: 'hi',     // India - Hindi
  TH: 'th',     // Thailand - Thai
  VN: 'vi',     // Vietnam - Vietnamese
  AR: 'ar',     // Arabic countries - Arabic
  IT: 'it',     // Italy - Italian
  NL: 'nl',     // Netherlands - Dutch
  PL: 'pl',     // Poland - Polish
  BR: 'pt',     // Brazil - Portuguese
  TR: 'tr',     // Turkey - Turkish
  default: 'en'  // Default to English for other countries
};

// Hardcoded identity generation function (fallback)
function generateIdentity(country: string, lang: string) {
  // Determine content language based on country, not UI language
  const contentLang = COUNTRY_LANGUAGES[country] || COUNTRY_LANGUAGES.default;
  console.log(`Generating identity for country: ${country}, content language: ${contentLang}`);
  
  // Chinese identities
  if (country === "CN") {
    // Always use Chinese language data for China
    const langData = {
      surnames: ["王", "李", "张", "刘", "陈", "杨", "赵", "黄", "周", "吴", "徐", "孙", "马", "朱", "胡"],
      maleNames: ["伟", "强", "军", "勇", "杰", "涛", "磊", "超", "明", "刚", "辉", "斌", "宇", "浩", "阳"],
      femaleNames: ["芳", "娜", "静", "丽", "敏", "燕", "玲", "萍", "红", "艳", "婷", "慧", "娟", "霞", "兰"],
      provinces: ["北京市", "上海市", "广州市", "深圳市", "杭州市", "南京市", "武汉市", "成都市", "重庆市", "天津市", "苏州市", "西安市", "长沙市", "青岛市", "大连市"],
      districts: ["朝阳区", "海淀区", "东城区", "西城区", "丰台区", "石景山区", "门头沟区", "房山区", "通州区", "顺义区", "昌平区", "大兴区", "怀柔区", "平谷区", "密云区"],
      streets: ["建国路", "长安街", "王府井", "西单", "中关村", "CBD", "金融街", "三里屯", "国贸", "望京", "朝阳公园", "工体北路", "东直门", "西直门", "德胜门"],
      occupations: ["工程师", "教师", "医生", "律师", "设计师", "程序员", "销售", "经理", "会计", "护士", "建筑师", "咨询师", "研究员", "记者", "编辑"],
      building: "号楼",
      room: "室"
    };
    
    // Force content language to Chinese for China
    const contentLang = 'zh';
    
    const gender = Math.random() > 0.5 ? "Male" : "Female";
    const surname = langData.surnames[Math.floor(Math.random() * langData.surnames.length)];
    const givenName = gender === "Male" 
      ? langData.maleNames[Math.floor(Math.random() * langData.maleNames.length)] 
      : langData.femaleNames[Math.floor(Math.random() * langData.femaleNames.length)];
    const fullName = surname + givenName;
    
    // Generate random birth date between 1970 and 2000
    const birthYear = Math.floor(Math.random() * 31) + 1970;
    const birthMonth = Math.floor(Math.random() * 12) + 1;
    const birthDay = Math.floor(Math.random() * 28) + 1;
    const birthDate = `${birthYear}-${birthMonth.toString().padStart(2, '0')}-${birthDay.toString().padStart(2, '0')}`;
    
    // Generate random address in Chinese format
    const province = langData.provinces[Math.floor(Math.random() * langData.provinces.length)];
    const district = langData.districts[Math.floor(Math.random() * langData.districts.length)];
    const streetName = langData.streets[Math.floor(Math.random() * langData.streets.length)];
    const building = Math.floor(Math.random() * 20) + 1;
    const room = Math.floor(Math.random() * 1000) + 1;
    const address = `${province}${district}${streetName}${building}${langData.building}${room}${langData.room}`;
    
    // Generate random phone number
    const phone = "1" + [3, 4, 5, 6, 7, 8, 9][Math.floor(Math.random() * 7)] + 
      Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    
    // Generate random email using pinyin for Chinese names
    const pinyinMap = {
      // Surnames
      "王":"wang","李":"li","张":"zhang","刘":"liu","陈":"chen","杨":"yang","赵":"zhao","黄":"huang","周":"zhou","吴":"wu","徐":"xu","孙":"sun","马":"ma","朱":"zhu","胡":"hu",
      // Male names
      "伟":"wei","强":"qiang","军":"jun","勇":"yong","杰":"jie","涛":"tao","磊":"lei","超":"chao","明":"ming","刚":"gang","辉":"hui","斌":"bin","宇":"yu","浩":"hao","阳":"yang",
      // Female names
      "芳":"fang","娜":"na","静":"jing","丽":"li","敏":"min","燕":"yan","玲":"ling","萍":"ping","红":"hong","艳":"yan","婷":"ting","慧":"hui","娟":"juan","霞":"xia","兰":"lan"
    };
    
    // Convert Chinese characters to pinyin
    let pinyinSurname = pinyinMap[surname] || surname;
    let pinyinGivenName = pinyinMap[givenName] || givenName;
    
    const email = `${pinyinSurname}${pinyinGivenName}${Math.floor(Math.random() * 1000)}@${["gmail.com", "163.com", "qq.com", "sina.com", "126.com"][Math.floor(Math.random() * 5)]}`;
    
    // Generate random occupation
    const occupation = langData.occupations[Math.floor(Math.random() * langData.occupations.length)];
    
    // Generate realistic Chinese national ID (18 digits)
    const areaCode = ["110101", "110102", "110105", "310101", "310104", "310105", "440103", "440104", "440106", "510104"][Math.floor(Math.random() * 10)];
    const birthdayCode = `${birthYear}${birthMonth.toString().padStart(2, '0')}${birthDay.toString().padStart(2, '0')}`;
    const sequenceCode = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const checkCode = ["1", "0", "X", "9", "8", "7", "6", "5", "4", "3", "2"][Math.floor(Math.random() * 11)];
    const nationalId = `${areaCode}${birthdayCode}${sequenceCode}${checkCode}`;
    
    // Generate realistic Chinese passport number
    const passportNumber = "E" + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
    
    // Use Chinese language fields for China
    const fields = {
      hairColors: ["黑色", "棕色", "深棕色", "金色", "银色"],
      bloodTypes: ["A型", "B型", "O型", "AB型"],
      educationLevels: ["高中", "学士", "硕士", "博士", "博士后"],
      companyNames: ["科技公司", "教育机构", "医疗机构", "金融公司", "制造企业", "互联网公司", "咨询公司", "房地产公司"],
      companySizes: ["1-10人", "11-50人", "51-200人", "201-500人", "500人以上"],
      employmentStatuses: ["全职", "兼职", "合同", "自由职业", "自主创业"],
      securityQuestions: ["您母亲的姓氏是什么？", "您出生城市的名称？", "您第一只宠物的名字？", "您小学的名称？", "您的幸运数字？"],
      cityDefault: "其他城市"
    };
    const operatingSystems = ["Windows 10", "Windows 11", "macOS", "Linux"];
    
    const street = `${Math.floor(Math.random() * 1000)} ${langData.streets[Math.floor(Math.random() * langData.streets.length)]}`;
    
    const cityMap = {
      zh: {
        "北京市": "北京市",
        "上海市": "上海市",
        "广州市": "广州市",
        "深圳市": "深圳市",
        "杭州市": "杭州市"
      },
      en: {
        "Beijing": "Beijing",
        "Shanghai": "Shanghai",
        "Guangzhou": "Guangzhou",
        "Shenzhen": "Shenzhen",
        "Hangzhou": "Hangzhou"
      },
      ja: {
        "北京市": "北京市",
        "上海市": "上海市",
        "広州市": "広州市",
        "深セン市": "深セン市",
        "杭州市": "杭州市"
      }
    };
    
    const cityMapForLang = cityMap[contentLang as keyof typeof cityMap] || cityMap.zh;
    const city = cityMapForLang[province] || fields.cityDefault;
    
    const zipCode = Math.floor(Math.random() * 900000) + 100000;
    const hairColor = fields.hairColors[Math.floor(Math.random() * fields.hairColors.length)];
    const height = `${Math.floor(Math.random() * 30) + 150}cm`;
    const weight = `${Math.floor(Math.random() * 50) + 50}kg`;
    const bloodType = fields.bloodTypes[Math.floor(Math.random() * fields.bloodTypes.length)];
    const username = `${surname.toLowerCase()}${givenName.toLowerCase()}${Math.floor(Math.random() * 1000)}`;
    const password = Math.random().toString(36).substring(2, 12);
    const operatingSystem = operatingSystems[Math.floor(Math.random() * operatingSystems.length)];
    const guid = `${Math.random().toString(16).substring(2, 10)}-${Math.random().toString(16).substring(2, 6)}-${Math.random().toString(16).substring(2, 6)}-${Math.random().toString(16).substring(2, 6)}-${Math.random().toString(16).substring(2, 12)}`;
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
    const education = fields.educationLevels[Math.floor(Math.random() * fields.educationLevels.length)];
    const personalWebsite = `${username}.com`;
    const securityQuestion = fields.securityQuestions[Math.floor(Math.random() * fields.securityQuestions.length)];
    const securityAnswer = `${langData.surnames[Math.floor(Math.random() * langData.surnames.length)]}`;
    const companyName = fields.companyNames[Math.floor(Math.random() * fields.companyNames.length)];
    const companySize = fields.companySizes[Math.floor(Math.random() * fields.companySizes.length)];
    const employmentStatus = fields.employmentStatuses[Math.floor(Math.random() * fields.employmentStatuses.length)];
    const monthlySalary = `¥${Math.floor(Math.random() * 10000) + 5000}`;
    const creditCardType = ["Visa", "MasterCard", "UnionPay"][Math.floor(Math.random() * 3)];
    
    // Generate realistic credit card
    const creditCard = {
      number: "6225" + Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0'),
      expiry: `${(Math.floor(Math.random() * 12) + 1).toString().padStart(2, '0')}/${(Math.floor(Math.random() * 10) + 26).toString().padStart(2, '0')}`,
      cvv: Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
      type: creditCardType
    };
    
    // Generate realistic bank account
    const bankAccount = "622202" + Math.floor(Math.random() * 10000000000000).toString().padStart(14, '0');
    
    // Generate avatar URL using text-to-image API
    const avatarUrl = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20portrait%20of%20${gender === 'Male' ? 'Chinese%20man' : 'Chinese%20woman'}%20working%20as%20${encodeURIComponent(occupation)}&image_size=portrait_4_3`;
    
    return {
      fullName,
      gender,
      birthDate,
      address,
      street,
      city,
      zipCode: zipCode.toString(),
      phone,
      email,
      occupation,
      companyName,
      companySize,
      employmentStatus,
      monthlySalary,
      nationalId,
      passportNumber,
      creditCard,
      bankAccount,
      hairColor,
      height,
      weight,
      bloodType,
      username,
      password,
      operatingSystem,
      guid,
      userAgent,
      education,
      personalWebsite,
      securityQuestion,
      securityAnswer,
      avatarUrl
    };
  }
  
  // American identities
  else if (country === "US") {
    const firstNamesMale = ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles"];
    const firstNamesFemale = ["Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen"];
    const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"];
    
    const gender = Math.random() > 0.5 ? "Male" : "Female";
    const firstName = gender === "Male" 
      ? firstNamesMale[Math.floor(Math.random() * firstNamesMale.length)] 
      : firstNamesFemale[Math.floor(Math.random() * firstNamesFemale.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const fullName = `${firstName} ${lastName}`;
    
    // Generate random birth date between 1970 and 2000
    const birthYear = Math.floor(Math.random() * 31) + 1970;
    const birthMonth = Math.floor(Math.random() * 12) + 1;
    const birthDay = Math.floor(Math.random() * 28) + 1;
    const birthDate = `${birthYear}-${birthMonth.toString().padStart(2, '0')}-${birthDay.toString().padStart(2, '0')}`;
    
    // Generate realistic address
    const states = ["California", "Texas", "Florida", "New York", "Pennsylvania", "Illinois", "Ohio", "Georgia", "North Carolina", "Michigan"];
    const stateCities = {
      "California": ["Los Angeles", "San Francisco", "San Diego", "San Jose", "Sacramento"],
      "Texas": ["Houston", "Dallas", "Austin", "San Antonio", "Fort Worth"],
      "Florida": ["Miami", "Orlando", "Tampa", "Jacksonville", "St. Petersburg"],
      "New York": ["New York City", "Buffalo", "Rochester", "Syracuse", "Albany"],
      "Pennsylvania": ["Philadelphia", "Pittsburgh", "Allentown", "Erie", "Reading"],
      "Illinois": ["Chicago", "Aurora", "Rockford", "Naperville", "Joliet"],
      "Ohio": ["Columbus", "Cleveland", "Cincinnati", "Toledo", "Akron"],
      "Georgia": ["Atlanta", "Augusta", "Columbus", "Savannah", "Athens"],
      "North Carolina": ["Charlotte", "Raleigh", "Greensboro", "Durham", "Winston-Salem"],
      "Michigan": ["Detroit", "Grand Rapids", "Warren", "Sterling Heights", "Lansing"]
    };
    const streets = ["Main St", "Oak Ave", "Maple Dr", "Cedar Ln", "Pine Rd", "Elm St", "Walnut Ave", "Chestnut Dr", "Birch Ln", "Spruce Rd"];
    const state = states[Math.floor(Math.random() * states.length)];
    const cities = stateCities[state as keyof typeof stateCities];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const streetName = streets[Math.floor(Math.random() * streets.length)];
    const zipCode = Math.floor(Math.random() * 90000) + 10000;
    const address = `${Math.floor(Math.random() * 1000)} ${streetName}, ${city}, ${state} ${zipCode}`;
    
    // Generate realistic phone number
    const areaCodes = ["212", "310", "415", "202", "305", "713", "312", "213", "702", "404"];
    const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
    const phone = `(${areaCode}) ${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    
    // Generate realistic email
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 1000)}@${["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com"][Math.floor(Math.random() * 5)]}`;
    
    // Generate random occupation
    const occupations = ["Engineer", "Teacher", "Doctor", "Lawyer", "Designer", "Programmer", "Salesperson", "Manager", "Accountant", "Nurse"];
    const occupation = occupations[Math.floor(Math.random() * occupations.length)];
    
    // Generate realistic SSN
    const ssnArea = Math.floor(Math.random() * 999).toString().padStart(3, '0');
    const ssnGroup = Math.floor(Math.random() * 99).toString().padStart(2, '0');
    const ssnSerial = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    const nationalId = `${ssnArea}-${ssnGroup}-${ssnSerial}`;
    
    // Generate realistic US passport number
    const passportNumber = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    
    // Generate additional fields
    const hairColors = ["Black", "Brown", "Blonde", "Red", "Gray"];
    const bloodTypes = ["A+", "B+", "O+", "AB+", "A-", "B-", "O-", "AB-"];
    const operatingSystems = ["Windows 10", "Windows 11", "macOS", "Linux"];
    const educationLevels = ["High School", "Bachelor's Degree", "Master's Degree", "PhD", "Professional Degree"];
    const companyNames = ["Tech Corp", "Global Industries", "Innovative Solutions", "Future Technologies", "United Enterprises"];
    const employmentStatuses = ["Full-time", "Part-time", "Contract", "Freelance", "Self-employed", "Leave of absence"];
    const companySizes = ["1-10 employees", "11-50 employees", "51-200 employees", "201-500 employees", "500+ employees"];
    const creditCardTypes = ["Visa", "MasterCard", "American Express", "Discover"];
    
    const street = `${Math.floor(Math.random() * 1000)} ${streets[Math.floor(Math.random() * streets.length)]}`;
    const hairColor = hairColors[Math.floor(Math.random() * hairColors.length)];
    const heightFeet = Math.floor(Math.random() * 3) + 5;
    const heightInches = Math.floor(Math.random() * 12);
    const heightCm = Math.round((heightFeet * 12 + heightInches) * 2.54);
    const height = `${heightFeet}' ${heightInches}" (${heightCm}cm)`;
    const weightLbs = Math.floor(Math.random() * 100) + 100;
    const weightKg = Math.round(weightLbs * 0.453592);
    const weight = `${weightLbs}lbs (${weightKg}kg)`;
    const bloodType = bloodTypes[Math.floor(Math.random() * bloodTypes.length)];
    const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 1000)}`;
    const password = Math.random().toString(36).substring(2, 12);
    const operatingSystem = operatingSystems[Math.floor(Math.random() * operatingSystems.length)];
    const guid = `${Math.random().toString(16).substring(2, 10)}-${Math.random().toString(16).substring(2, 6)}-${Math.random().toString(16).substring(2, 6)}-${Math.random().toString(16).substring(2, 6)}-${Math.random().toString(16).substring(2, 12)}`;
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
    const education = educationLevels[Math.floor(Math.random() * educationLevels.length)];
    const personalWebsite = `${username}.com`;
    const securityQuestion = "What is the last 4 of your SSN?";
    const securityAnswer = nationalId.split('-')[2];
    const companyName = companyNames[Math.floor(Math.random() * companyNames.length)];
    const companySize = companySizes[Math.floor(Math.random() * companySizes.length)];
    const employmentStatus = employmentStatuses[Math.floor(Math.random() * employmentStatuses.length)];
    const monthlySalary = `$${Math.floor(Math.random() * 5000) + 3000}`;
    const creditCardType = creditCardTypes[Math.floor(Math.random() * creditCardTypes.length)];
    
    // Generate realistic credit card
    const creditCard = {
      number: "4" + Math.floor(Math.random() * 1000000000000000).toString().padStart(15, '0'),
      expiry: `${(Math.floor(Math.random() * 12) + 1).toString().padStart(2, '0')}/${(Math.floor(Math.random() * 10) + 26).toString().padStart(2, '0')}`,
      cvv: Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
      type: creditCardType
    };
    
    // Generate realistic bank account
    const bankAccount = Math.floor(Math.random() * 10000000000000000).toString().padStart(16, '0');
    
    // Generate avatar URL using text-to-image API
    const avatarUrl = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20portrait%20of%20${gender === 'Male' ? 'American%20man' : 'American%20woman'}%20working%20as%20${encodeURIComponent(occupation)}&image_size=portrait_4_3`;
    
    return {
      fullName,
      gender,
      birthDate,
      address,
      street,
      city,
      state,
      stateFullName: state,
      zipCode: zipCode.toString(),
      phone,
      email,
      occupation,
      companyName,
      companySize,
      employmentStatus,
      monthlySalary,
      nationalId,
      passportNumber,
      creditCard,
      bankAccount,
      hairColor,
      height,
      weight,
      bloodType,
      username,
      password,
      operatingSystem,
      guid,
      userAgent,
      education,
      personalWebsite,
      securityQuestion,
      securityAnswer,
      avatarUrl
    };
  }
  
  // Japanese identities
  else if (country === "JP") {
    // Always use Japanese language data for Japan
    const langData = {
      surnames: ["佐藤", "鈴木", "高橋", "田中", "伊藤", "渡辺", "山本", "中村", "小林", "加藤"],
      maleNames: ["大輔", "健太", "翔太", "拓也", "直樹", "隆", "陽太", "悠太", "大介", "裕太"],
      femaleNames: ["美咲", "花子", "麻衣", "優香", "結衣", "梨香", "薫", "楓", "渚", "茜"],
      prefectures: ["東京都", "大阪府", "神奈川県", "埼玉県", "千葉県", "愛知県", "兵庫県", "北海道", "福岡県", "静岡県"],
      cities: ["東京", "大阪", "横浜", "名古屋", "札幌", "神戸", "福岡", "川崎", "横須賀", "京都"],
      streets: ["中央通り", "栄通り", "新宿通り", "銀座通り", "渋谷通り", "池袋通り", "上野通り", "浅草通り", "六本木通り", "原宿通り"],
      occupations: ["エンジニア", "教師", "医師", "弁護士", "デザイナー", "プログラマー", "営業", "マネージャー", "会計", "看護師"],
      building: "号館",
      room: "号室"
    };
    
    // Force content language to Japanese for Japan
    const contentLang = 'ja';
    
    const gender = Math.random() > 0.5 ? "Male" : "Female";
    const surname = langData.surnames[Math.floor(Math.random() * langData.surnames.length)];
    const givenName = gender === "Male" 
      ? langData.maleNames[Math.floor(Math.random() * langData.maleNames.length)] 
      : langData.femaleNames[Math.floor(Math.random() * langData.femaleNames.length)];
    const fullName = surname + givenName;
    
    // Generate random birth date between 1970 and 2000
    const birthYear = Math.floor(Math.random() * 31) + 1970;
    const birthMonth = Math.floor(Math.random() * 12) + 1;
    const birthDay = Math.floor(Math.random() * 28) + 1;
    const birthDate = `${birthYear}-${birthMonth.toString().padStart(2, '0')}-${birthDay.toString().padStart(2, '0')}`;
    
    // Generate random address in Japanese format
    const prefecture = langData.prefectures[Math.floor(Math.random() * langData.prefectures.length)];
    const city = langData.cities[Math.floor(Math.random() * langData.cities.length)];
    const streetName = langData.streets[Math.floor(Math.random() * langData.streets.length)];
    const building = Math.floor(Math.random() * 20) + 1;
    const room = Math.floor(Math.random() * 1000) + 1;
    const address = `${prefecture}${city}${streetName}${building}${langData.building}${room}${langData.room}`;
    
    // Generate random phone number
    const phone = "0" + [3, 5, 6, 7, 8, 9][Math.floor(Math.random() * 6)] + 
      Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
    
    // Generate random email using romaji for Japanese names
    const romajiMap = {
      // Surnames
      "佐藤":"sato","鈴木":"suzuki","高橋":"takahashi","田中":"tanaka","伊藤":"ito","渡辺":"watanabe","山本":"yamamoto","中村":"nakamura","小林":"kobayashi","加藤":"kato",
      // Male names
      "大輔":"daisuke","健太":"kenta","翔太":"shota","拓也":"takuya","直樹":"naoki","隆":"takashi","陽太":"yota","悠太":"yuta","大介":"daisuke","裕太":"yuta",
      // Female names
      "美咲":"misaki","花子":"hanako","麻衣":"mai","優香":"yuka","結衣":"yui","梨香":"rika","薫":"kaoru","楓":"kaede","渚":"nagisa","茜":"akane"
    };
    
    // Convert Japanese characters to romaji
    let romajiSurname = romajiMap[surname] || surname;
    let romajiGivenName = romajiMap[givenName] || givenName;
    
    const email = `${romajiSurname}${romajiGivenName}${Math.floor(Math.random() * 1000)}@${["gmail.com", "yahoo.co.jp", "hotmail.co.jp", "outlook.jp", "icloud.com"][Math.floor(Math.random() * 5)]}`;
    
    // Generate random occupation
    const occupation = langData.occupations[Math.floor(Math.random() * langData.occupations.length)];
    
    // Generate realistic Japanese national ID (12 digits)
    const nationalId = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
    
    // Generate realistic Japanese passport number
    const passportNumber = "E" + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
    
    // Use Japanese language fields for Japan
    const fields = {
      hairColors: ["黒", "茶色", "金色", "銀色", "灰色"],
      bloodTypes: ["A型", "B型", "O型", "AB型"],
      educationLevels: ["高校", "学士", "修士", "博士", "博士課程後"],
      companyNames: ["テクノロジー会社", "教育機関", "医療機関", "金融会社", "製造企業", "インターネット会社", "コンサルティング会社", "不動産会社"],
      companySizes: ["1-10人", "11-50人", "51-200人", "201-500人", "500人以上"],
      employmentStatuses: ["正社員", "パートタイム", "契約社員", "フリーランス", "自営業"],
      securityQuestions: ["あなたの母親の名字は何ですか？", "あなたの出身都市の名前は？", "あなたの最初のペットの名前は？", "あなたの小学校の名前は？", "あなたの幸運な数字は？"],
      cityDefault: "その他の都市"
    };
    const operatingSystems = ["Windows 10", "Windows 11", "macOS", "Linux"];
    
    const street = `${Math.floor(Math.random() * 1000)} ${langData.streets[Math.floor(Math.random() * langData.streets.length)]}`;
    const zipCode = Math.floor(Math.random() * 900000) + 100000;
    const hairColor = fields.hairColors[Math.floor(Math.random() * fields.hairColors.length)];
    const height = `${Math.floor(Math.random() * 30) + 150}cm`;
    const weight = `${Math.floor(Math.random() * 50) + 50}kg`;
    const bloodType = fields.bloodTypes[Math.floor(Math.random() * fields.bloodTypes.length)];
    const username = `${surname.toLowerCase()}${givenName.toLowerCase()}${Math.floor(Math.random() * 1000)}`;
    const password = Math.random().toString(36).substring(2, 12);
    const operatingSystem = operatingSystems[Math.floor(Math.random() * operatingSystems.length)];
    const guid = `${Math.random().toString(16).substring(2, 10)}-${Math.random().toString(16).substring(2, 6)}-${Math.random().toString(16).substring(2, 6)}-${Math.random().toString(16).substring(2, 6)}-${Math.random().toString(16).substring(2, 12)}`;
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
    const education = fields.educationLevels[Math.floor(Math.random() * fields.educationLevels.length)];
    const personalWebsite = `${username}.com`;
    const securityQuestion = fields.securityQuestions[Math.floor(Math.random() * fields.securityQuestions.length)];
    const securityAnswer = `${langData.surnames[Math.floor(Math.random() * langData.surnames.length)]}`;
    const companyName = fields.companyNames[Math.floor(Math.random() * fields.companyNames.length)];
    const companySize = fields.companySizes[Math.floor(Math.random() * fields.companySizes.length)];
    const employmentStatus = fields.employmentStatuses[Math.floor(Math.random() * fields.employmentStatuses.length)];
    const monthlySalary = `¥${Math.floor(Math.random() * 300000) + 200000}`;
    const creditCardType = ["Visa", "MasterCard", "JCB"][Math.floor(Math.random() * 3)];
    
    // Generate realistic credit card
    const creditCard = {
      number: "4" + Math.floor(Math.random() * 1000000000000000).toString().padStart(15, '0'),
      expiry: `${(Math.floor(Math.random() * 12) + 1).toString().padStart(2, '0')}/${(Math.floor(Math.random() * 10) + 26).toString().padStart(2, '0')}`,
      cvv: Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
      type: creditCardType
    };
    
    // Generate realistic bank account
    const bankAccount = Math.floor(Math.random() * 10000000000000000).toString().padStart(16, '0');
    
    // Generate avatar URL using text-to-image API
    const avatarUrl = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20portrait%20of%20${gender === 'Male' ? 'Japanese%20man' : 'Japanese%20woman'}%20working%20as%20${encodeURIComponent(occupation)}&image_size=portrait_4_3`;
    
    return {
      fullName,
      gender,
      birthDate,
      address,
      street,
      city,
      zipCode: zipCode.toString(),
      phone,
      email,
      occupation,
      companyName,
      companySize,
      employmentStatus,
      monthlySalary,
      nationalId,
      passportNumber,
      creditCard,
      bankAccount,
      hairColor,
      height,
      weight,
      bloodType,
      username,
      password,
      operatingSystem,
      guid,
      userAgent,
      education,
      personalWebsite,
      securityQuestion,
      securityAnswer,
      avatarUrl
    };
  }
  
  // Default identity for other countries
  else {
    console.log(`Debug: Entering default identity generation for country: ${country}`);
    const gender = Math.random() > 0.5 ? "Male" : "Female";
    let firstName, lastName, fullName, lastNames;
    
    // Country-specific name generation
    console.log(`Debug: Country switch value: ${country}`);
    switch (country) {
      case 'GB': // United Kingdom
        console.log('Debug: Matched GB case');
        const gbFirstNamesMale = ["James", "Oliver", "George", "William", "Harry", "Charlie", "Thomas", "Joseph", "Jacob", "Alfie"];
        const gbFirstNamesFemale = ["Olivia", "Amelia", "Isabella", "Sophia", "Ava", "Emily", "Lily", "Ella", "Freya", "Mia"];
        const gbLastNames = ["Smith", "Jones", "Taylor", "Brown", "Wilson", "Davies", "Evans", "Johnson", "Thomas", "Robinson"];
        lastNames = gbLastNames;
        firstName = gender === "Male" ? gbFirstNamesMale[Math.floor(Math.random() * gbFirstNamesMale.length)] : gbFirstNamesFemale[Math.floor(Math.random() * gbFirstNamesFemale.length)];
        lastName = gbLastNames[Math.floor(Math.random() * gbLastNames.length)];
        fullName = `${firstName} ${lastName}`;
        break;
        
      case 'DE': // Germany
        const deFirstNamesMale = ["Max", "Lukas", "Leon", "Felix", "Noah", "Paul", "Jonas", "Elias", "Robin", "Ben"];
        const deFirstNamesFemale = ["Mia", "Emma", "Hannah", "Sophia", "Lena", "Lea", "Luna", "Anna", "Marie", "Emily"];
        const deLastNames = ["Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Schulz", "Hoffmann"];
        lastNames = deLastNames;
        firstName = gender === "Male" ? deFirstNamesMale[Math.floor(Math.random() * deFirstNamesMale.length)] : deFirstNamesFemale[Math.floor(Math.random() * deFirstNamesFemale.length)];
        lastName = deLastNames[Math.floor(Math.random() * deLastNames.length)];
        fullName = `${firstName} ${lastName}`;
        break;
        
      case 'FR': // France
        const frFirstNamesMale = ["Gabriel", "Lucas", "Hugo", "Louis", "Arthur", "Jules", "Adam", "Nathan", "Leo", "Ethan"];
        const frFirstNamesFemale = ["Emma", "Alice", "Chloé", "Lina", "Léa", "Mila", "Lola", "Camille", "Zoe", "Julia"];
        const frLastNames = ["Martin", "Bernard", "Dubois", "Thomas", "Robert", "Richard", "Durand", "Dubois", "Petit", "Simon"];
        lastNames = frLastNames;
        firstName = gender === "Male" ? frFirstNamesMale[Math.floor(Math.random() * frFirstNamesMale.length)] : frFirstNamesFemale[Math.floor(Math.random() * frFirstNamesFemale.length)];
        lastName = frLastNames[Math.floor(Math.random() * frLastNames.length)];
        fullName = `${firstName} ${lastName}`;
        break;
        
      case 'ES': // Spain
        const esFirstNamesMale = ["Lucas", "Hugo", "Martín", "Daniel", "Pablo", "Álvaro", "Mateo", "Leo", "Alejandro", "Enzo"];
        const esFirstNamesFemale = ["Lucía", "Sofía", "María", "Martina", "Julia", "Paula", "Valeria", "Daniela", "Carmen", "Alba"];
        const esLastNames = ["García", "Rodríguez", "González", "Fernández", "López", "Martínez", "Sanchez", "Pérez", "Gómez", "Martín"];
        lastNames = esLastNames;
        firstName = gender === "Male" ? esFirstNamesMale[Math.floor(Math.random() * esFirstNamesMale.length)] : esFirstNamesFemale[Math.floor(Math.random() * esFirstNamesFemale.length)];
        lastName = esLastNames[Math.floor(Math.random() * esLastNames.length)];
        fullName = `${firstName} ${lastName}`;
        break;
        
      case 'RU': // Russia
        const ruFirstNamesMale = ["Александр", "Дмитрий", "Максим", "Иван", "Андрей", "Сергей", "Артем", "Кирилл", "Никита", "Михаил"];
        const ruFirstNamesFemale = ["Анна", "Мария", "Елена", "Ольга", "Татьяна", "Екатерина", "Светлана", "Наталья", "Евгения", "Марина"];
        const ruLastNames = ["Иванов", "Петров", "Сидоров", "Козлов", "Смирнов", "Новиков", "Федоров", "Михайлов", "Волков", "Алексеев"];
        lastNames = ruLastNames;
        firstName = gender === "Male" ? ruFirstNamesMale[Math.floor(Math.random() * ruFirstNamesMale.length)] : ruFirstNamesFemale[Math.floor(Math.random() * ruFirstNamesFemale.length)];
        lastName = ruLastNames[Math.floor(Math.random() * ruLastNames.length)];
        fullName = `${lastName} ${firstName}`;
        break;
        
      case 'IN': // India
        const inFirstNamesMale = ["Aarav", "Aditya", "Arjun", "Vivaan", "Rohan", "Aryan", "Shaurya", "Krishna", "Ishaan", "Dhruv"];
        const inFirstNamesFemale = ["Diya", "Aadhya", "Anaya", "Saanvi", "Isha", "Aaradhya", "Aanya", "Riya", "Naina", "Myra"];
        const inLastNames = ["Sharma", "Verma", "Singh", "Gupta", "Kumar", "Patel", "Jain", "Mehta", "Chaudhary", "Yadav"];
        lastNames = inLastNames;
        firstName = gender === "Male" ? inFirstNamesMale[Math.floor(Math.random() * inFirstNamesMale.length)] : inFirstNamesFemale[Math.floor(Math.random() * inFirstNamesFemale.length)];
        lastName = inLastNames[Math.floor(Math.random() * inLastNames.length)];
        fullName = `${firstName} ${lastName}`;
        break;
        
      case 'TH': // Thailand
        const thFirstNamesMale = ["ชัย", "วิชัย", "วัชร", "สมชาย", "สุรชัย", "วินัย", "ประชัย", "สมศักดิ์", "วิรัช", "ธนารัตน์"];
        const thFirstNamesFemale = ["สุภัสสรา", "วรวรณี", "กนกวรรณ", "พิมพ์พร", "นิภาดา", "สุมาลี", "อรุณา", "มารีย์", "ปนัดดา", "จันทร์"];
        const thLastNames = ["สุขุม", "เจริญ", "กิตติ", "ทองคำ", "ประเสริฐ", "ศรี", "สมบูรณ์", "สวัสดิ์", "สมชาย", "ดี"];
        lastNames = thLastNames;
        firstName = gender === "Male" ? thFirstNamesMale[Math.floor(Math.random() * thFirstNamesMale.length)] : thFirstNamesFemale[Math.floor(Math.random() * thFirstNamesFemale.length)];
        lastName = thLastNames[Math.floor(Math.random() * thLastNames.length)];
        fullName = `${firstName} ${lastName}`;
        break;
        
      case 'VN': // Vietnam
        const vnFirstNamesMale = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Phan", "Vũ", "Đặng", "Bùi", "Đỗ"];
        const vnFirstNamesFemale = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Phan", "Vũ", "Đặng", "Bùi", "Đỗ"];
        const vnMiddleNames = ["Văn", "Thị", "Đức", "Thanh", "Hữu", "Minh", "Ngọc", "Quốc", "Thảo", "Hải"];
        const vnLastNames = ["Anh", "Hùng", "Long", "Mai", "Lan", "Hoa", "Tuấn", "Nguyên", "Trung", "Dũng"];
        lastNames = vnLastNames;
        const vnLastName = vnFirstNamesMale[Math.floor(Math.random() * vnFirstNamesMale.length)];
        const vnMiddleName = vnMiddleNames[Math.floor(Math.random() * vnMiddleNames.length)];
        const vnGivenName = gender === "Male" ? vnLastNames[Math.floor(Math.random() * vnLastNames.length)] : vnLastNames[Math.floor(Math.random() * vnLastNames.length)];
        firstName = vnGivenName; // Set firstName for email generation
        lastName = vnLastName; // Set lastName for email generation
        fullName = `${vnLastName} ${vnMiddleName} ${vnGivenName}`;
        break;
        
      case 'AR': // Arabic countries
        const arFirstNamesMale = ["Mohammed", "Ahmed", "Omar", "Ali", "Hassan", "Abdullah", "Khalid", "Said", "Yousef", "Ibrahim"];
        const arFirstNamesFemale = ["Fatima", "Aisha", "Maryam", "Amina", "Sarah", "Noor", "Hala", "Layla", "Zainab", "Noura"];
        const arLastNames = ["Al-Sayed", "El-Hassan", "Abdullah", "Mohammed", "Ali", "Omar", "Hassan", "Ibrahim", "Ahmed", "Khalid"];
        lastNames = arLastNames;
        firstName = gender === "Male" ? arFirstNamesMale[Math.floor(Math.random() * arFirstNamesMale.length)] : arFirstNamesFemale[Math.floor(Math.random() * arFirstNamesFemale.length)];
        lastName = arLastNames[Math.floor(Math.random() * arLastNames.length)];
        fullName = `${firstName} ${lastName}`;
        break;
        
      case 'IT': // Italy
        const itFirstNamesMale = ["Luca", "Matteo", "Leonardo", "Alessandro", "Tommaso", "Francesco", "Davide", "Riccardo", "Edoardo", "Gabriele"];
        const itFirstNamesFemale = ["Sofia", "Aurora", "Giulia", "Ginevra", "Alice", "Emma", "Chiara", "Francesca", "Beatrice", "Matilde"];
        const itLastNames = ["Rossi", "Russo", "Ferrari", "Esposito", "Bianchi", "Romano", "Colombo", "Ricci", "Marino", "Greco"];
        lastNames = itLastNames;
        firstName = gender === "Male" ? itFirstNamesMale[Math.floor(Math.random() * itFirstNamesMale.length)] : itFirstNamesFemale[Math.floor(Math.random() * itFirstNamesFemale.length)];
        lastName = itLastNames[Math.floor(Math.random() * itLastNames.length)];
        fullName = `${firstName} ${lastName}`;
        break;
        
      case 'NL': // Netherlands
        const nlFirstNamesMale = ["Daan", "Liam", "Lucas", "Noah", "Jesse", "Sem", "Finn", "Milan", "Levi", "Julian"];
        const nlFirstNamesFemale = ["Julia", "Emma", "Mila", "Sophie", "Zoë", "Luna", "Lisa", "Fenna", "Eva", "Sofia"];
        const nlLastNames = ["Jansen", "de Jong", "de Vries", "van den Berg", "van Dijk", "Bakker", "Janssen", "Visser", "Smit", "Meijer"];
        lastNames = nlLastNames;
        firstName = gender === "Male" ? nlFirstNamesMale[Math.floor(Math.random() * nlFirstNamesMale.length)] : nlFirstNamesFemale[Math.floor(Math.random() * nlFirstNamesFemale.length)];
        lastName = nlLastNames[Math.floor(Math.random() * nlLastNames.length)];
        fullName = `${firstName} ${lastName}`;
        break;
        
      case 'PL': // Poland
        const plFirstNamesMale = ["Jan", "Piotr", "Krzysztof", "Tomasz", "Andrzej", "Paweł", "Marcin", "Michał", "Łukasz", "Adam"];
        const plFirstNamesFemale = ["Anna", "Maria", "Katarzyna", "Małgorzata", "Agnieszka", "Barbara", "Ewa", "Elżbieta", "Dorota", "Joanna"];
        const plLastNames = ["Nowak", "Kowalski", "Wiśniewski", "Wójcik", "Kowalczyk", "Kamiński", "Lewandowski", "Zieliński", "Szymański", "Woźniak"];
        lastNames = plLastNames;
        firstName = gender === "Male" ? plFirstNamesMale[Math.floor(Math.random() * plFirstNamesMale.length)] : plFirstNamesFemale[Math.floor(Math.random() * plFirstNamesFemale.length)];
        lastName = plLastNames[Math.floor(Math.random() * plLastNames.length)];
        fullName = `${firstName} ${lastName}`;
        break;
        
      case 'BR': // Brazil
        const brFirstNamesMale = ["João", "Pedro", "Lucas", "Mateus", "Gabriel", "Enzo", "Rafael", "Gustavo", "Felipe", "Henrique"];
        const brFirstNamesFemale = ["Maria", "Ana", "Julia", "Isabella", "Sophia", "Manuela", "Luiza", "Helena", "Laura", "Mariana"];
        const brLastNames = ["Silva", "Santos", "Oliveira", "Pereira", "Souza", "Rodrigues", "Ferreira", "Almeida", "Costa", "Gomes"];
        lastNames = brLastNames;
        firstName = gender === "Male" ? brFirstNamesMale[Math.floor(Math.random() * brFirstNamesMale.length)] : brFirstNamesFemale[Math.floor(Math.random() * brFirstNamesFemale.length)];
        lastName = brLastNames[Math.floor(Math.random() * brLastNames.length)];
        fullName = `${firstName} ${lastName}`;
        break;
        
      case 'TR': // Turkey
        const trFirstNamesMale = ["Mehmet", "Ahmet", "Mustafa", "Ali", "Hasan", "İsmail", "Osman", "Ayhan", "Metin", "Yusuf"];
        const trFirstNamesFemale = ["Ayşe", "Fatma", "Emine", "Zeynep", "Hatice", "Meryem", "Gülşah", "Şebnem", "Elif", "Melis"];
        const trLastNames = ["Yılmaz", "Kaya", "Demir", "Şahin", "Çelik", "Öztürk", "Kara", "Aydın", "Koç", "Arslan"];
        lastNames = trLastNames;
        firstName = gender === "Male" ? trFirstNamesMale[Math.floor(Math.random() * trFirstNamesMale.length)] : trFirstNamesFemale[Math.floor(Math.random() * trFirstNamesFemale.length)];
        lastName = trLastNames[Math.floor(Math.random() * trLastNames.length)];
        fullName = `${firstName} ${lastName}`;
        break;
        
      default: // Default to English names for other countries
        const defaultFirstNamesMale = ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles"];
        const defaultFirstNamesFemale = ["Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen"];
        const defaultLastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"];
        lastNames = defaultLastNames;
        firstName = gender === "Male" ? defaultFirstNamesMale[Math.floor(Math.random() * defaultFirstNamesMale.length)] : defaultFirstNamesFemale[Math.floor(Math.random() * defaultFirstNamesFemale.length)];
        lastName = defaultLastNames[Math.floor(Math.random() * defaultLastNames.length)];
        fullName = `${firstName} ${lastName}`;
    }
    
    // Generate random birth date between 1970 and 2000
    const birthYear = Math.floor(Math.random() * 31) + 1970;
    const birthMonth = Math.floor(Math.random() * 12) + 1;
    const birthDay = Math.floor(Math.random() * 28) + 1;
    const birthDate = `${birthYear}-${birthMonth.toString().padStart(2, '0')}-${birthDay.toString().padStart(2, '0')}`;
    
    // Generate realistic address based on country
    let address, city, street;
    
    switch (country) {
      case 'GB': // United Kingdom
        const gbCities = ["London", "Birmingham", "Manchester", "Liverpool", "Leeds", "Glasgow", "Edinburgh", "Bristol", "Belfast", "Cardiff"];
        const gbStreets = ["High Street", "Station Road", "Main Street", "Church Road", "Park Road", "Church Street", "London Road", "Station Street", "New Road", "King Street"];
        city = gbCities[Math.floor(Math.random() * gbCities.length)];
        street = gbStreets[Math.floor(Math.random() * gbStreets.length)];
        const gbPostcode = `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))} ${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)} ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
        address = `${Math.floor(Math.random() * 100)} ${street}, ${city}, ${gbPostcode}`;
        break;
        
      case 'DE': // Germany
        const deCities = ["Berlin", "Munich", "Hamburg", "Cologne", "Frankfurt", "Stuttgart", "Düsseldorf", "Dortmund", "Essen", "Leipzig"];
        const deStreets = ["Hauptstraße", "Bahnhofstraße", "Münchener Straße", "Berliner Straße", "Schulstraße", "Marktplatz", "Rathausplatz", "Kurfürstenstraße", "Friedrichstraße", "Königstraße"];
        city = deCities[Math.floor(Math.random() * deCities.length)];
        street = deStreets[Math.floor(Math.random() * deStreets.length)];
        const dePostcode = `${Math.floor(Math.random() * 9000) + 1000}`;
        address = `${Math.floor(Math.random() * 100)} ${street}, ${dePostcode} ${city}, Germany`;
        break;
        
      case 'FR': // France
        const frCities = ["Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes", "Strasbourg", "Montpellier", "Bordeaux", "Lille"];
        const frStreets = ["Rue de la République", "Rue de Paris", "Avenue de la Liberté", "Rue du Commerce", "Rue de la Gare", "Rue Principale", "Avenue Jean Jaurès", "Rue Victor Hugo", "Rue des Ecoles", "Rue de la Mairie"];
        city = frCities[Math.floor(Math.random() * frCities.length)];
        street = frStreets[Math.floor(Math.random() * frStreets.length)];
        const frPostcode = `${Math.floor(Math.random() * 90000) + 10000}`;
        address = `${Math.floor(Math.random() * 100)} ${street}, ${frPostcode} ${city}, France`;
        break;
        
      case 'ES': // Spain
        const esCities = ["Madrid", "Barcelona", "Valencia", "Seville", "Zaragoza", "Malaga", "Murcia", "Palma", "Las Palmas", "Bilbao"];
        const esStreets = ["Calle Gran Vía", "Calle Mayor", "Calle de la Princesa", "Calle de Alcalá", "Calle de Serrano", "Paseo de la Castellana", "Calle de Fuencarral", "Calle de la Cruz", "Calle de la Montera", "Calle de Carretas"];
        city = esCities[Math.floor(Math.random() * esCities.length)];
        street = esStreets[Math.floor(Math.random() * esStreets.length)];
        const esPostcode = `${Math.floor(Math.random() * 52000) + 1000}`;
        address = `${Math.floor(Math.random() * 100)} ${street}, ${esPostcode} ${city}, Spain`;
        break;
        
      case 'RU': // Russia
        const ruCities = ["Moscow", "Saint Petersburg", "Novosibirsk", "Yekaterinburg", "Kazan", "Nizhny Novgorod", "Chelyabinsk", "Samara", "Omsk", "Rostov-on-Don"];
        const ruStreets = ["Тверская улица", "Ленинский проспект", "Арбат", "Красная площадь", "Невский проспект", "Пушкинская улица", "Кировский проспект", "Советский проспект", "Московский проспект", "Гагаринский проспект"];
        city = ruCities[Math.floor(Math.random() * ruCities.length)];
        street = ruStreets[Math.floor(Math.random() * ruStreets.length)];
        address = `${Math.floor(Math.random() * 100)} ${street}, ${city}, Russia`;
        break;
        
      case 'IN': // India
        const inCities = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Ahmedabad", "Pune", "Surat", "Jaipur"];
        const inStreets = ["MG Road", "Station Road", "Main Street", "Church Road", "Park Street", "Nehru Road", "Gandhi Road", "Railway Road", "Market Road", "College Road"];
        city = inCities[Math.floor(Math.random() * inCities.length)];
        street = inStreets[Math.floor(Math.random() * inStreets.length)];
        address = `${Math.floor(Math.random() * 100)} ${street}, ${city}, India`;
        break;
        
      case 'TH': // Thailand
        const thCities = ["Bangkok", "Chiang Mai", "Phuket", "Pattaya", "Hua Hin", "Krabi", "Surat Thani", "Chiang Rai", "Ayutthaya", "Nakhon Ratchasima"];
        const thStreets = ["ถนนพระราม", "ถนนสุทธิสาร", "ถนนสีลม", "ถนนพระจันทร์", "ถนนสาทร", "ถนนพญาไท", "ถนนราชดำริ", "ถนนเพชรบุรี", "ถนนสุขุมวิท", "ถนนอโศก"];
        city = thCities[Math.floor(Math.random() * thCities.length)];
        street = thStreets[Math.floor(Math.random() * thStreets.length)];
        address = `${Math.floor(Math.random() * 100)} ${street}, ${city}, Thailand`;
        break;
        
      case 'VN': // Vietnam
        const vnCities = ["Ho Chi Minh City", "Hanoi", "Da Nang", "Can Tho", "Hai Phong", "Bien Hoa", "Vung Tau", "Nha Trang", "Huế", "Da Lat"];
        const vnStreets = ["Đường Lê Lợi", "Đường Nguyễn Huệ", "Đường Trần Hưng Đạo", "Đường Võ Văn Tần", "Đường Nguyễn Văn Cừ", "Đường Tôn Đức Thắng", "Đường Hùng Vương", "Đường Trần Quang Khải", "Đường Phạm Ngũ Lão", "Đường Trương Định"];
        city = vnCities[Math.floor(Math.random() * vnCities.length)];
        street = vnStreets[Math.floor(Math.random() * vnStreets.length)];
        address = `${Math.floor(Math.random() * 100)} ${street}, ${city}, Vietnam`;
        break;
        
      case 'AR': // Arabic countries
        const arCities = ["Cairo", "Alexandria", "Giza", "Shubra El Kheima", "Port Said", "Suez", "Luxor", "Asyut", "Fayyum", "Minya"];
        const arStreets = ["شارع المصريين", "شارع الجمال", "شارع السادات", "شارع الكرamat", "شارع القاهرة", "شارع العز", "شارع التحرير", "شارع المعز", "شارع محمد علي", "شارع النيل"];
        city = arCities[Math.floor(Math.random() * arCities.length)];
        street = arStreets[Math.floor(Math.random() * arStreets.length)];
        address = `${Math.floor(Math.random() * 100)} ${street}, ${city}, Egypt`;
        break;
        
      case 'IT': // Italy
        const itCities = ["Rome", "Milan", "Naples", "Turin", "Palermo", "Genoa", "Bologna", "Florence", "Bari", "Catania"];
        const itStreets = ["Via Roma", "Via Nazionale", "Via Garibaldi", "Via Vittorio Emanuele", "Via但丁", "Via XX Settembre", "Via dei Condotti", "Via Montenapoleone", "Via della Libertà", "Via Cola di Rienzo"];
        city = itCities[Math.floor(Math.random() * itCities.length)];
        street = itStreets[Math.floor(Math.random() * itStreets.length)];
        const itPostcode = `${Math.floor(Math.random() * 90000) + 10000}`;
        address = `${Math.floor(Math.random() * 100)} ${street}, ${itPostcode} ${city}, Italy`;
        break;
        
      case 'NL': // Netherlands
        const nlCities = ["Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven", "Tilburg", "Groningen", "Almere", "Breda", "Nijmegen"];
        const nlStreets = ["Damrak", "Kalverstraat", "Leidsestraat", "Prinsengracht", "Keizersgracht", "Herengracht", "Weteringschans", "Stadhouderskade", "Overtoom", "Zuidas"];
        city = nlCities[Math.floor(Math.random() * nlCities.length)];
        street = nlStreets[Math.floor(Math.random() * nlStreets.length)];
        const nlPostcode = `${Math.floor(Math.random() * 9000) + 1000} ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
        address = `${Math.floor(Math.random() * 100)} ${street}, ${nlPostcode} ${city}, Netherlands`;
        break;
        
      case 'PL': // Poland
        const plCities = ["Warsaw", "Krakow", "Łódź", "Wrocław", "Poznań", "Gdańsk", "Szczecin", "Bydgoszcz", "Lublin", "Białystok"];
        const plStreets = ["ul. Marszałkowska", "ul. Świętokrzyska", "ul. Nowy Świat", "ul. Krakowskie Przedmieście", "ul. Żelazna", "ul. Grzybowska", "ul. Jasna", "ul. Emilii Plater", "ul. Chłodna", "ul. Zgoda"];
        city = plCities[Math.floor(Math.random() * plCities.length)];
        street = plStreets[Math.floor(Math.random() * plStreets.length)];
        const plPostcode = `${Math.floor(Math.random() * 90000) + 10000}`;
        address = `${Math.floor(Math.random() * 100)} ${street}, ${plPostcode} ${city}, Poland`;
        break;
        
      case 'BR': // Brazil
        const brCities = ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador", "Fortaleza", "Belo Horizonte", "Manaus", "Curitiba", "Recife", "Porto Alegre"];
        const brStreets = ["Avenida Paulista", "Rua Augusta", "Avenida Faria Lima", "Rua Oscar Freire", "Avenida Presidente Vargas", "Rua 25 de Março", "Avenida Atlântica", "Rua Barão de Capanema", "Avenida Brasil", "Rua das Flores"];
        city = brCities[Math.floor(Math.random() * brCities.length)];
        street = brStreets[Math.floor(Math.random() * brStreets.length)];
        const brPostcode = `${Math.floor(Math.random() * 90000000) + 10000000}`;
        address = `${Math.floor(Math.random() * 1000)} ${street}, ${city}, ${brPostcode}, Brazil`;
        break;
        
      case 'TR': // Turkey
        const trCities = ["Istanbul", "Ankara", "Izmir", "Bursa", "Adana", "Gaziantep", "Konya", "Antalya", "Kayseri", "Mersin"];
        const trStreets = ["İstiklal Caddesi", "Bağdat Caddesi", "Atatürk Caddesi", "Cumhuriyet Caddesi", "Şişli Meşrutiyet Caddesi", "Kadıköy Bahariye Caddesi", "Bebek Bosphorus Caddesi", "Nişantaşı Bağdat Caddesi", "Kızılay Caddesi", "Bornova Caddesi"];
        city = trCities[Math.floor(Math.random() * trCities.length)];
        street = trStreets[Math.floor(Math.random() * trStreets.length)];
        const trPostcode = `${Math.floor(Math.random() * 90000) + 1000}`;
        address = `${Math.floor(Math.random() * 100)} ${street}, ${trPostcode} ${city}, Turkey`;
        break;
        
      default: // Default address format
        const defaultCities = ["London", "Paris", "Berlin", "Madrid", "Rome", "Tokyo", "Sydney", "Toronto", "Moscow", "Cairo"];
        const defaultStreets = ["Main St", "Oak Ave", "Maple Dr", "Cedar Ln", "Pine Rd", "Elm St", "Walnut Ave", "Chestnut Dr", "Birch Ln", "Spruce Rd"];
        city = defaultCities[Math.floor(Math.random() * defaultCities.length)];
        street = defaultStreets[Math.floor(Math.random() * defaultStreets.length)];
        address = `${Math.floor(Math.random() * 1000)} ${street}, ${city}, Country`;
    }
    

    
    // Ensure lastNames is defined for all cases
    if (typeof lastNames === 'undefined') {
      const defaultLastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"];
      lastNames = defaultLastNames;
    }
    
    // Generate realistic phone number based on country
    let phone;
    const phoneFormats = {
      US: () => {
        const areaCodes = ["212", "310", "415", "202", "305", "713", "312", "213", "702", "404"];
        const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
        return `(${areaCode}) ${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      },
      GB: () => {
        const areaCodes = ["20", "121", "161", "113", "141", "191", "28", "131", "1733", "1224"];
        const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
        return `+44 ${areaCode} ${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`;
      },
      DE: () => {
        const areaCodes = ["30", "40", "69", "89", "211", "221", "49", "611", "341", "511"];
        const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
        return `+49 ${areaCode} ${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`;
      },
      FR: () => {
        const areaCodes = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
        const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
        return `+33 ${areaCode} ${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`;
      },
      ES: () => {
        const areaCodes = ["91", "93", "95", "92", "94", "96", "971", "98", "972", "952"];
        const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
        return `+34 ${areaCode} ${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`;
      },
      IT: () => {
        const areaCodes = ["02", "06", "011", "040", "0444", "051", "055", "081", "091", "071"];
        const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
        return `+39 ${areaCode} ${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`;
      },
      NL: () => {
        const areaCodes = ["20", "70", "30", "40", "50", "71", "10", "23", "24", "26"];
        const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
        return `+31 ${areaCode} ${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`;
      },
      PL: () => {
        const areaCodes = ["22", "61", "12", "42", "48", "32", "58", "71", "91", "81"];
        const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
        return `+48 ${areaCode} ${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`;
      },
      BR: () => {
        const areaCodes = ["11", "12", "13", "14", "15", "16", "17", "18", "19", "21"];
        const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
        return `+55 ${areaCode} ${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
      },
      TR: () => {
        const areaCodes = ["212", "216", "312", "232", "242", "412", "322", "222", "252", "286"];
        const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
        return `+90 ${areaCode} ${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`;
      },
      RU: () => {
        const areaCodes = ["495", "499", "812", "4012", "843", "381", "423", "491", "863", "485"];
        const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
        return `+7 ${areaCode} ${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`;
      },
      IN: () => {
        const areaCodes = ["11", "22", "33", "44", "55", "66", "77", "88", "99", "20"];
        const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
        return `+91 ${areaCode} ${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
      },
      TH: () => {
        const areaCodes = ["2", "32", "33", "34", "35", "36", "37", "38", "42", "43"];
        const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
        return `+66 ${areaCode} ${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`;
      },
      VN: () => {
        const areaCodes = ["24", "28", "234", "236", "25", "26", "27", "29", "31", "32"];
        const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
        return `+84 ${areaCode} ${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`;
      },
      AR: () => {
        const areaCodes = ["20", "21", "22", "23", "24", "25", "26", "27", "28", "29"];
        const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
        return `+20 ${areaCode} ${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`;
      },
      default: () => {
        return "+" + (Math.floor(Math.random() * 90) + 10) + " " + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
      }
    };
    
    const phoneFormat = phoneFormats[country as keyof typeof phoneFormats] || phoneFormats.default;
    phone = phoneFormat();
    
    // Generate realistic email
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 1000)}@${["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "example.com"][Math.floor(Math.random() * 5)]}`;
    
    // Generate random occupation based on country
    let occupation;
    const occupations = {
      DE: ["Ingenieur", "Lehrer", "Arzt", "Anwalt", "Designer", "Programmierer", "Verkäufer", "Manager", "Buchhalter", "Krankenschwester"],
      FR: ["Ingénieur", "Enseignant", "Médecin", "Avocat", "Designer", "Programmeur", "Vendeur", "Manager", "Comptable", "Infirmière"],
      ES: ["Ingeniero", "Profesor", "Médico", "Abogado", "Diseñador", "Programador", "Vendedor", "Gerente", "Contador", "Enfermera"],
      IT: ["Ingegnere", "Insegnante", "Medico", "Avvocato", "Designer", "Programmatore", "Venditore", "Manager", "Commercialista", "Infermiera"],
      NL: ["Ingenieur", "Leraar", "Arts", "Advocaat", "Ontwerper", "Programmeur", "Verkoopmedewerker", "Manager", "Accountant", "Verpleegkundige"],
      PL: ["Inżynier", "Nauczyciel", "Lekarz", "Adwokat", "Designer", "Programista", "Sprzedawca", "Manager", "Księgowy", "Pielegniarka"],
      BR: ["Engenheiro", "Professor", "Médico", "Advogado", "Designer", "Programador", "Vendedor", "Gerente", "Contador", "Enfermeira"],
      TR: ["Mühendis", "Öğretmen", "Doktor", "Avukat", "Tasarımcı", "Programcı", "Satış Danışmanı", "Yönetici", "Muhasebeci", "Hemşire"],
      RU: ["Инженер", "Учитель", "Врач", "Адвокат", "Дизайнер", "Программист", "Продавец", "Менеджер", "Бухгалтер", "Медсестра"],
      TH: ["วิศวกร", "ครู", "แพทย์", "ทนายความ", "นักออกแบบ", "โปรแกรมเมอร์", "พนักงานขาย", "ผู้จัดการ", "นักบัญชี", "พยาบาล"],
      VN: ["Kỹ sư", "Giáo viên", "Bác sĩ", "Luật sư", "Thiết kế", "Lập trình viên", "Nhân viên bán hàng", "Quản lý", "Kế toán", "Y tá"],
      AR: ["مهندس", "معلم", "طبيب", "محامي", "مصمم", "مبرمج", "بائع", "مدير", "محاسب", "ممرضة"],
      default: ["Engineer", "Teacher", "Doctor", "Lawyer", "Designer", "Programmer", "Salesperson", "Manager", "Accountant", "Nurse"]
    };
    
    const countryOccupations = occupations[country as keyof typeof occupations] || occupations.default;
    occupation = countryOccupations[Math.floor(Math.random() * countryOccupations.length)];
    
    // Generate realistic national ID based on country
    let nationalId;
    const nationalIdFormats = {
      US: () => {
        const ssnArea = Math.floor(Math.random() * 999).toString().padStart(3, '0');
        const ssnGroup = Math.floor(Math.random() * 99).toString().padStart(2, '0');
        const ssnSerial = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
        return `${ssnArea}-${ssnGroup}-${ssnSerial}`;
      },
      GB: () => {
        // National Insurance Number format: 2 letters, 6 digits, 1 letter
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const firstLetter = letters[Math.floor(Math.random() * letters.length)];
        const secondLetter = letters[Math.floor(Math.random() * letters.length)];
        const digits = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        const lastLetter = letters[Math.floor(Math.random() * letters.length)];
        return `${firstLetter}${secondLetter} ${digits} ${lastLetter}`;
      },
      DE: () => {
        // Personalausweis format: 10 digits
        return Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
      },
      FR: () => {
        // INSEE format: 13 digits
        return Math.floor(Math.random() * 10000000000000).toString().padStart(13, '0');
      },
      ES: () => {
        // DNI format: 8 digits + letter
        const digits = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
        const letters = "TRWAGMYFPDXBNJZSQVHLCKE";
        const letter = letters[parseInt(digits) % 23];
        return `${digits}${letter}`;
      },
      IT: () => {
        // Codice Fiscale format: 16 alphanumeric characters
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const digits = "0123456789";
        let code = '';
        for (let i = 0; i < 16; i++) {
          code += Math.random() > 0.5 ? letters[Math.floor(Math.random() * letters.length)] : digits[Math.floor(Math.random() * digits.length)];
        }
        return code.toUpperCase();
      },
      NL: () => {
        // BSN format: 9 digits
        return Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
      },
      PL: () => {
        // PESEL format: 11 digits
        return Math.floor(Math.random() * 100000000000).toString().padStart(11, '0');
      },
      BR: () => {
        // CPF format: 11 digits with dots and dash
        const digits = Math.floor(Math.random() * 100000000000).toString().padStart(11, '0');
        return `${digits.substring(0, 3)}.${digits.substring(3, 6)}.${digits.substring(6, 9)}-${digits.substring(9, 11)}`;
      },
      TR: () => {
        // TC Kimlik No format: 11 digits
        return Math.floor(Math.random() * 100000000000).toString().padStart(11, '0');
      },
      RU: () => {
        // Паспорт format: 10 digits
        return Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
      },
      IN: () => {
        // Aadhaar format: 12 digits
        return Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
      },
      TH: () => {
        // Thai ID format: 13 digits
        return Math.floor(Math.random() * 10000000000000).toString().padStart(13, '0');
      },
      VN: () => {
        // Vietnamese ID format: 9-12 digits
        const length = Math.floor(Math.random() * 4) + 9;
        return Math.floor(Math.random() * Math.pow(10, length)).toString().padStart(length, '0');
      },
      AR: () => {
        // Egyptian ID format: 14 digits
        return Math.floor(Math.random() * 100000000000000).toString().padStart(14, '0');
      },
      default: () => {
        return Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
      }
    };
    
    const nationalIdFormat = nationalIdFormats[country as keyof typeof nationalIdFormats] || nationalIdFormats.default;
    nationalId = nationalIdFormat();
    
    // Generate realistic passport number
    const passportNumber = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
    
    // Generate additional fields
    const hairColors = ["Black", "Brown", "Blonde", "Red", "Gray"];
    const bloodTypes = ["A+", "B+", "O+", "AB+", "A-", "B-", "O-", "AB-"];
    const operatingSystems = ["Windows 10", "Windows 11", "macOS", "Linux"];
    
    // Country-specific education levels
    const educationLevels = {
      DE: ["Hauptschule", "Realschule", "Gymnasium", "Bachelor", "Master", "Doktor"],
      FR: ["Collège", "Lycée", "Licence", "Master", "Doctorat"],
      ES: ["Educación Secundaria", "Bachillerato", "Grado", "Master", "Doctorado"],
      IT: ["Scuola Media", "Liceo", "Laurea", "Master", "Dottorato"],
      NL: ["VMBO", "HAVO", "VWO", "Bachelor", "Master", "Doctoraat"],
      PL: ["Szkoła Podstawowa", "Gimnazjum", "Liceum", "Licencjat", "Magister", "Doktor"],
      BR: ["Ensino Fundamental", "Ensino Médio", "Graduação", "Pós-graduação", "Doutorado"],
      TR: ["İlkokul", "Ortaokul", "Lise", "Lisans", "Yüksek Lisans", "Doktora"],
      RU: ["Начальная школа", "Средняя школа", "Бакалавр", "Магистр", "Доктор"],
      TH: ["โรงเรียนประถม", "โรงเรียนมัธยม", "ปริญญาตรี", "ปริญญาโท", "ปริญญาเอก"],
      VN: ["Trung học cơ sở", "Trung học phổ thông", "Cao đẳng", "Đại học", "Thạc sĩ", "Tiến sĩ"],
      AR: ["مدرسة ابتدائية", "مدرسة متوسطة", "مدرسة ثانوية", "درجة البكالوريوس", "درجة الماجستير", "درجة الدكتوراة"],
      default: ["High School", "Bachelor's Degree", "Master's Degree", "PhD", "Professional Degree"]
    };
    
    // Country-specific company names
    const companyNames = {
      DE: ["Technik GmbH", "Global Industrie", "Innovative Lösungen", "Zukunftstechnologie", "United Unternehme"],
      FR: ["Tech Société", "Industries Globales", "Solutions Innovantes", "Technologies Futures", "Entreprises Unies"],
      ES: ["Tech Corporación", "Industrias Globales", "Soluciones Innovadoras", "Tecnologías del Futuro", "Empresas Unidas"],
      IT: ["Tech S.p.A.", "Industrie Globali", "Soluzioni Innovative", "Tecnologie del Futuro", "Imprese Unite"],
      NL: ["Tech B.V.", "Global Industrie", "Innovatieve Oplossingen", "Toekomsttechnologie", "Verenigde Ondernemingen"],
      PL: ["Tech Sp. z o.o.", "Globalne Przemysł", "Innowacyjne Rozwiązania", "Technologie Przyszłości", "Zjednoczone Przedsiębiorstwa"],
      BR: ["Tech Corporação", "Indústrias Globais", "Soluções Inovadoras", "Tecnologias do Futuro", "Empresas Unidas"],
      TR: ["Teknoloji A.Ş.", "Küresel Endüstri", "İnovasyon Çözümleri", "Gelecek Teknolojileri", "Birleşik İşletmeler"],
      RU: ["Тех Корпорация", "Глобальная Индустрия", "Инновационные Решения", "Будущие Технологии", "Объединенные Предприятия"],
      TH: ["เทคคอร์ปอเรชั่น", "อุตสาหกรรมโลก", "โซลูชันนวัตกรรม", "เทคโนโลยีแห่งอนาคต", "ธุรกิจร่วม"],
      VN: ["Công ty Tech", "Công nghiệp Toàn cầu", "Giải pháp Đổi mới", "Công nghệ Tương lai", "Doanh nghiệp Liên hiệp"],
      AR: ["تك كورپوريشن", "صناعة عالمية", "حلول مبتكرة", "تكنولوجيا المستقبل", "شركات متحدة"],
      default: ["Tech Corp", "Global Industries", "Innovative Solutions", "Future Technologies", "United Enterprises"]
    };
    
    // Country-specific employment statuses
    const employmentStatuses = {
      DE: ["Vollzeit", "Teilzeit", "Vertrag", "Freiberufler", "Selbstständig"],
      FR: ["À temps plein", "À temps partiel", "Contrat", "Indépendant", "Entrepreneur"],
      ES: ["Tiempo completo", "Tiempo parcial", "Contrato", "Freelance", "Autónomo"],
      IT: ["Tempo pieno", "Tempo parziale", "Contratto", "Freelance", "Autonomo"],
      NL: ["Volledige tijd", "Deeltijd", "Contract", "Freelance", "Zelfstandig"],
      PL: ["Pełny etat", "Częściowy etat", "Kontrakt", "Freelance", "Samozatrudniony"],
      BR: ["Tempo integral", "Meio período", "Contrato", "Freelance", "Autônomo"],
      TR: ["Tam zamanlı", "Yarı zamanlı", "Sözleşme", "Serbest çalışan", "Kendi işi"],
      RU: ["Полный рабочий день", "Частичная занятость", "Контракт", "Фрилансер", "Самозанятый"],
      TH: ["เวลาเต็ม", "เวลาเพียงบางส่วน", "สัญญา", "ฟรีแลนซ์", "รับจ้างเอง"],
      VN: ["Toàn thời gian", "Bán thời gian", "Hợp đồng", "Tự do", "Tự kinh doanh"],
      AR: ["وقت كامل", "وقت جزئي", "عقد", "فريلانسر", "عامل مستقل"],
      default: ["Full-time", "Part-time", "Contract", "Freelance", "Self-employed"]
    };
    
    // Country-specific company sizes
    const companySizes = {
      DE: ["1-10 Mitarbeiter", "11-50 Mitarbeiter", "51-200 Mitarbeiter", "201-500 Mitarbeiter", "500+ Mitarbeiter"],
      FR: ["1-10 employés", "11-50 employés", "51-200 employés", "201-500 employés", "500+ employés"],
      ES: ["1-10 empleados", "11-50 empleados", "51-200 empleados", "201-500 empleados", "500+ empleados"],
      IT: ["1-10 dipendenti", "11-50 dipendenti", "51-200 dipendenti", "201-500 dipendenti", "500+ dipendenti"],
      NL: ["1-10 werknemers", "11-50 werknemers", "51-200 werknemers", "201-500 werknemers", "500+ werknemers"],
      PL: ["1-10 pracowników", "11-50 pracowników", "51-200 pracowników", "201-500 pracowników", "500+ pracowników"],
      BR: ["1-10 funcionários", "11-50 funcionários", "51-200 funcionários", "201-500 funcionários", "500+ funcionários"],
      TR: ["1-10 çalışan", "11-50 çalışan", "51-200 çalışan", "201-500 çalışan", "500+ çalışan"],
      RU: ["1-10 сотрудников", "11-50 сотрудников", "51-200 сотрудников", "201-500 сотрудников", "500+ сотрудников"],
      TH: ["1-10 พนักงาน", "11-50 พนักงาน", "51-200 พนักงาน", "201-500 พนักงาน", "500+ พนักงาน"],
      VN: ["1-10 nhân viên", "11-50 nhân viên", "51-200 nhân viên", "201-500 nhân viên", "500+ nhân viên"],
      AR: ["1-10 موظف", "11-50 موظف", "51-200 موظف", "201-500 موظف", "500+ موظف"],
      default: ["1-10 employees", "11-50 employees", "51-200 employees", "201-500 employees", "500+ employees"]
    };
    
    const creditCardTypes = ["Visa", "MasterCard", "American Express", "Discover"];
    
    const hairColor = hairColors[Math.floor(Math.random() * hairColors.length)];
    const height = `${Math.floor(Math.random() * 30) + 150}cm`;
    const weight = `${Math.floor(Math.random() * 50) + 50}kg`;
    const bloodType = bloodTypes[Math.floor(Math.random() * bloodTypes.length)];
    const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 1000)}`;
    const password = Math.random().toString(36).substring(2, 12);
    const operatingSystem = operatingSystems[Math.floor(Math.random() * operatingSystems.length)];
    const guid = `${Math.random().toString(16).substring(2, 10)}-${Math.random().toString(16).substring(2, 6)}-${Math.random().toString(16).substring(2, 6)}-${Math.random().toString(16).substring(2, 6)}-${Math.random().toString(16).substring(2, 12)}`;
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
    
    // Use country-specific values
    const countryEducationLevels = educationLevels[country as keyof typeof educationLevels] || educationLevels.default;
    const countryCompanyNames = companyNames[country as keyof typeof companyNames] || companyNames.default;
    const countryEmploymentStatuses = employmentStatuses[country as keyof typeof employmentStatuses] || employmentStatuses.default;
    const countryCompanySizes = companySizes[country as keyof typeof companySizes] || companySizes.default;
    
    const education = countryEducationLevels[Math.floor(Math.random() * countryEducationLevels.length)];
    const personalWebsite = `${username}.com`;
    
    // Country-specific security questions
    const securityQuestions = {
      DE: ["Was ist Ihr Geburtsort?", "Wie heißt Ihre Mutter?", "Was ist Ihr erstes Haustier gewesen?", "Wie heißt Ihre erste Schule?", "Was ist Ihre Lieblingsfarbe?"],
      FR: ["Quelle est votre ville de naissance?", "Comment s'appelle votre mère?", "Quel était votre premier animal de compagnie?", "Comment s'appelle votre première école?", "Quelle est votre couleur préférée?"],
      ES: ["¿Cuál es su lugar de nacimiento?", "¿Cómo se llama su madre?", "¿Cuál fue su primera mascota?", "¿Cómo se llama su primera escuela?", "¿Cuál es su color favorito?"],
      IT: ["Qual è il tuo luogo di nascita?", "Come si chiama tua madre?", "Qual è stato il tuo primo animale domestico?", "Come si chiama la tua prima scuola?", "Qual è il tuo colore preferito?"],
      NL: ["Wat is uw geboorteplaats?", "Hoe heet uw moeder?", "Wat was uw eerste huisdier?", "Hoe heet uw eerste school?", "Wat is uw favoriete kleur?"],
      PL: ["Jaki jest Twój miejscowość urodzenia?", "Jak się nazywa Twoja matka?", "Jakie było Twoje pierwsze zwierzę domowe?", "Jak się nazywała Twoja pierwsza szkoła?", "Jaki jest Twój ulubiony kolor?"],
      BR: ["Qual é seu local de nascimento?", "Como se chama sua mãe?", "Qual foi seu primeiro animal de estimação?", "Como se chama sua primeira escola?", "Qual é sua cor favorita?"],
      TR: ["Doğum yeriniz neresi?", "Annenizin adı nedir?", "İlk evcil hayvanınız neydi?", "İlk okulunuzun adı nedir?", "En sevdiğiniz renk nedir?"],
      RU: ["Какой ваш город рождения?", "Как зовут вашу мать?", "Какое было ваше первое животное?", "Как зовут вашу первую школу?", "Какой ваш любимый цвет?"],
      TH: ["ที่เกิดของคุณคืออะไร?", "แม่ของคุณชื่ออะไร?", "สัตว์เลี้ยงตัวแรกของคุณคืออะไร?", "โรงเรียนแรกของคุณชื่ออะไร?", "สีโปรดของคุณคืออะไร?"],
      VN: ["Bạn sinh ra ở đâu?", "Mẹ của bạn tên gì?", "Thú cưng đầu tiên của bạn là gì?", "Trường tiểu học đầu tiên của bạn tên gì?", "Màu yêu thích của bạn là gì?"],
      AR: ["ما هو مكان ميلادك؟", "كيف تُدعى أمك؟", "ما كان حيوانك الأليف الأول؟", "كيف تُدعى مدرستك الأولى؟", "ما هو لونك المفضل؟"],
      default: ["What is your mother's maiden name?", "What is your birth city?", "What was your first pet's name?", "What is your elementary school name?", "What is your favorite color?"]
    };
    
    const countrySecurityQuestions = securityQuestions[country as keyof typeof securityQuestions] || securityQuestions.default;
    const securityQuestion = countrySecurityQuestions[Math.floor(Math.random() * countrySecurityQuestions.length)];
    const securityAnswer = `${lastName}`;
    
    const companyName = countryCompanyNames[Math.floor(Math.random() * countryCompanyNames.length)];
    const companySize = countryCompanySizes[Math.floor(Math.random() * countryCompanySizes.length)];
    const employmentStatus = countryEmploymentStatuses[Math.floor(Math.random() * countryEmploymentStatuses.length)];
    
    // Country-specific currency
    const currencies = {
      DE: "€", FR: "€", ES: "€", IT: "€", NL: "€", PL: "zł", BR: "R$", TR: "₺", RU: "₽", TH: "฿", VN: "₫", AR: "EGP",
      default: "$"
    };
    
    const currency = currencies[country as keyof typeof currencies] || currencies.default;
    const monthlySalary = `${currency}${Math.floor(Math.random() * 5000) + 3000}`;
    const creditCardType = creditCardTypes[Math.floor(Math.random() * creditCardTypes.length)];
    
    // Generate realistic credit card
    const creditCard = {
      number: "4" + Math.floor(Math.random() * 1000000000000000).toString().padStart(15, '0'),
      expiry: `${(Math.floor(Math.random() * 12) + 1).toString().padStart(2, '0')}/${(Math.floor(Math.random() * 10) + 26).toString().padStart(2, '0')}`,
      cvv: Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
      type: creditCardType
    };
    
    // Generate realistic bank account
    const bankAccount = Math.floor(Math.random() * 10000000000000000).toString().padStart(16, '0');
    
    // Generate avatar URL using text-to-image API
    const avatarUrl = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20portrait%20of%20${gender === 'Male' ? 'man' : 'woman'}%20working%20as%20${encodeURIComponent(occupation)}&image_size=portrait_4_3`;
    
    return {
      fullName,
      gender,
      birthDate,
      address,
      street,
      city,
      phone,
      email,
      occupation,
      companyName,
      companySize,
      employmentStatus,
      monthlySalary,
      nationalId,
      passportNumber,
      creditCard,
      bankAccount,
      hairColor,
      height,
      weight,
      bloodType,
      username,
      password,
      operatingSystem,
      guid,
      userAgent,
      education,
      personalWebsite,
      securityQuestion,
      securityAnswer,
      avatarUrl
    };
  }
}

async function startServer() {
  const app = express();
  const PORT = 3003;

  app.use(express.json({ limit: '10mb' }));
  app.use(cors());

  // API Routes
  app.get("/api/emails/real", (req, res) => {
    const email = db.prepare("SELECT email FROM real_emails ORDER BY RANDOM() LIMIT 1").get() as { email: string };
    res.json(email);
  });

  app.post("/api/identity/generate", async (req, res) => {
    const { country, lang, dataSource, count = 1 } = req.body;
    
    try {
      const identities = [];
      
      for (let i = 0; i < count; i++) {
        let identity;
        
        // Try AI generation first with timeout
        try {
          console.log(`Attempting AI generation for ${country}`);
          
          // Set timeout for AI generation
          const aiPromise = generateIdentityWithNVIDIA(country, lang);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('AI generation timeout')), 10000)
          );
          
          const aiIdentity = await Promise.race([aiPromise, timeoutPromise]);
          
          // Validate AI-generated identity
          if (aiIdentity && validateAIIdentity(aiIdentity, country)) {
            console.log(`AI generation successful for ${country}`);
            identity = aiIdentity;
          } else {
            console.log(`AI generation failed validation for ${country}, falling back to local generation`);
            identity = generateIdentity(country, lang);
          }
        } catch (error) {
          console.log(`AI generation failed for ${country}:`, error.message);
          console.log(`Falling back to local generation for ${country}`);
          identity = generateIdentity(country, lang);
        }

        // Normalize gender to uppercase
        let normalizedGender = identity.gender || 'Male';
        if (normalizedGender) {
          normalizedGender = normalizedGender.charAt(0).toUpperCase() + normalizedGender.slice(1);
          console.log("Normalized gender:", normalizedGender);
          // Update the identity object with the normalized gender
          identity.gender = normalizedGender;
        }

        // Generate avatar URL using text-to-image API
        let genderTerm = normalizedGender === 'Male' ? 'man' : 'woman';
        if (country === 'CN') {
          genderTerm = normalizedGender === 'Male' ? 'Chinese%20man' : 'Chinese%20woman';
        } else if (country === 'US') {
          genderTerm = normalizedGender === 'Male' ? 'American%20man' : 'American%20woman';
        } else if (country === 'JP') {
          genderTerm = normalizedGender === 'Male' ? 'Japanese%20man' : 'Japanese%20woman';
        }
        
        // Use English occupation for avatar prompt
        let englishOccupation = "professional";
        
        // Simple English occupation mapping
        const englishOccupations = [
          "engineer", "teacher", "doctor", "lawyer", "designer", "programmer", "salesperson", "manager", "accountant", "nurse",
          "architect", "consultant", "researcher", "reporter", "editor"
        ];
        
        // Always use a random English occupation to ensure URL compatibility
        englishOccupation = englishOccupations[Math.floor(Math.random() * englishOccupations.length)];
        
        // Use reliable public image placeholder services with fallback options
        let avatarUrl;
        try {
          // Try to use Unsplash random user photos as first option
          avatarUrl = `https://randomuser.me/api/portraits/${gender === 'Male' ? 'men' : 'women'}/${Math.floor(Math.random() * 100)}.jpg`;
        } catch (error) {
          // Fallback to placehold.co if randomuser fails
          console.log('Random user portrait failed, using placehold fallback');
          avatarUrl = `https://placehold.co/512x512/e6e6fa/6366f1?text=${encodeURIComponent(englishOccupation)}`;
        }
        
        // Always use a fallback image to ensure image availability
        // This will be used if the above services fail
        const fallbackImages = [
          'https://placehold.co/512x512/ecf0f1/3498db?text=Professional',
          'https://placehold.co/512x512/f8f9fa/6c757d?text=Identity'
        ];
        
        // Store both primary and fallback URLs for redundancy
        identity.avatarUrl = avatarUrl;
        identity.fallbackAvatarUrl = fallbackImages[Math.floor(Math.random() * fallbackImages.length)];

        // Blockchain Hashing & Watermark
        const lastEntry = db.prepare("SELECT blockchain_hash FROM generation_history ORDER BY id DESC LIMIT 1").get() as { blockchain_hash: string } | undefined;
        const prevHash = lastEntry?.blockchain_hash || "0".repeat(64);
        const watermark = `IDGEN-V2-${CryptoJS.lib.WordArray.random(8).toString()}`;
        const dataToHash = JSON.stringify(identity) + prevHash + watermark;
        const currentHash = CryptoJS.SHA256(dataToHash).toString();

        const result = {
          ...identity,
          blockchainHash: currentHash,
          previousHash: prevHash,
          watermark
        };

        identities.push(result);
      }

      res.json(identities);
    } catch (error) {
      console.error("Generation Error:", error);
      res.status(500).json({ error: "Failed to generate identity" });
    }
  });

  // Function to validate AI-generated identity
  function validateAIIdentity(identity: any, country: string): boolean {
    // Check required fields
    const requiredFields = [
      'fullName', 'gender', 'birthDate', 'address', 'phone', 'email',
      'occupation', 'nationalId', 'passportNumber', 'creditCard'
    ];
    
    for (const field of requiredFields) {
      if (!identity[field]) {
        console.log(`Missing required field: ${field}`);
        return false;
      }
    }
    
    // Validate email format (no Chinese characters)
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(identity.email)) {
      console.log(`Invalid email format: ${identity.email}`);
      return false;
    }
    
    // Validate phone number (should not be empty and should contain digits)
    if (!identity.phone || !/\d/.test(identity.phone)) {
      console.log(`Invalid phone number: ${identity.phone}`);
      return false;
    }
    
    // Validate birth date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(identity.birthDate)) {
      console.log(`Invalid birth date format: ${identity.birthDate}`);
      return false;
    }
    
    // Validate credit card object
    if (!identity.creditCard || !identity.creditCard.number || !identity.creditCard.expiry || !identity.creditCard.cvv) {
      console.log(`Invalid credit card data`);
      return false;
    }
    
    // Country-specific validation
    switch (country) {
      case 'CN':
        // Chinese national ID should be 18 digits
        if (!/^\d{17}[\dXx]$/.test(identity.nationalId)) {
          console.log(`Invalid Chinese national ID: ${identity.nationalId}`);
          return false;
        }
        break;
      case 'US':
        // US SSN should be in format XXX-XX-XXXX
        if (!/^\d{3}-\d{2}-\d{4}$/.test(identity.nationalId)) {
          console.log(`Invalid US SSN: ${identity.nationalId}`);
          return false;
        }
        break;
      case 'JP':
        // Japanese national ID should be 12 digits
        if (!/^\d{12}$/.test(identity.nationalId)) {
          console.log(`Invalid Japanese national ID: ${identity.nationalId}`);
          return false;
        }
        break;
    }
    
    console.log(`AI identity validation passed for ${country}`);
    return true;
  }

  app.post("/api/history", (req, res) => {
    const { country, fullName, gender, birthDate, address, phone, email, occupation, nationalId, passportNumber, creditCard, bankAccount, avatarUrl, lifestyleUrl, blockchainHash, previousHash, watermark } = req.body;
    const stmt = db.prepare(`
      INSERT INTO generation_history (country, full_name, gender, birth_date, address, phone, email, occupation, national_id, passport_number, credit_card, bank_account, avatar_url, lifestyle_url, blockchain_hash, previous_hash, watermark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(country, fullName, gender, birthDate, address, phone, email, occupation, nationalId, passportNumber, creditCard ? JSON.stringify(creditCard) : null, bankAccount, avatarUrl, lifestyleUrl, blockchainHash, previousHash, watermark);
    
    // Keep only the latest 30 records
    const countStmt = db.prepare("SELECT COUNT(*) as count FROM generation_history");
    const count = countStmt.get() as { count: number };
    if (count.count > 30) {
      const deleteStmt = db.prepare("DELETE FROM generation_history WHERE id IN (SELECT id FROM generation_history ORDER BY created_at ASC LIMIT ?)");
      deleteStmt.run(count.count - 30);
    }
    
    res.json({ success: true });
  });

  // Get history with 3-month expiration filter
  app.get("/api/history", (req, res) => {
    // Calculate date 3 months ago
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const threeMonthsAgoStr = threeMonthsAgo.toISOString();
    
    const history = db.prepare("SELECT * FROM generation_history WHERE created_at >= ? ORDER BY created_at DESC LIMIT 50").all(threeMonthsAgoStr);
    res.json(history);
  });

  // Delete history record
  app.delete("/api/history/:id", (req, res) => {
    try {
      const { id } = req.params;
      const result = db.prepare("DELETE FROM generation_history WHERE id = ?").run(id);
      if (result.changes > 0) {
        res.json({ status: "success", message: "History record deleted" });
      } else {
        res.status(404).json({ status: "error", message: "History record not found" });
      }
    } catch (error) {
      console.error("Delete history error:", error);
      res.status(500).json(API_CONFIG.response.error.serverError);
    }
  });

  // API endpoint to generate API key
  app.post("/api/keys/generate", (req, res) => {
    try {
      const { data } = req.body;
      if (!data) {
        return res.status(400).json(API_CONFIG.response.error.badRequest);
      }
      
      // Generate content hash from the provided data
      const contentHash = generateContentHash(data);
      
      // Generate API key using HashKeyManager
      const apiKey = hashKeyManager.generateKey(contentHash);
      
      res.json({
        status: "success",
        apiKey,
        contentHash,
        expiresAt: Date.now() + 90 * 24 * 60 * 60 * 1000 // 90 days (3 months)
      });
    } catch (error) {
      console.error("Key generation error:", error);
      res.status(500).json(API_CONFIG.response.error.serverError);
    }
  });

  // Enhanced External API for Agents like OpenClaw with hash-based authentication
  app.post("/api/external/identity", async (req, res) => {
    // Validate API key using hash-based authentication
    if (!validateApiKey(req)) {
      return res.status(401).json(API_CONFIG.response.error.unauthorized);
    }

    const { prompt, country } = req.body;

    try {
      // First try to generate identity using NVIDIA API
      let identityData = await generateIdentityWithNVIDIA(country || "US", "en");
      
      // Fallback to hardcoded function if NVIDIA API fails
      if (!identityData) {
        console.log("Falling back to hardcoded identity generation");
        identityData = generateIdentity(country || "US", "en");
      }

      // Generate avatar URL using text-to-image API
      const avatarUrl = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20portrait%20of%20${identityData.gender === 'Male' ? country === 'CN' ? 'Chinese%20man' : country === 'US' ? 'American%20man' : 'man' : country === 'CN' ? 'Chinese%20woman' : country === 'US' ? 'American%20woman' : 'woman'}%20working%20as%20${encodeURIComponent(identityData.occupation)}&image_size=portrait_4_3`;

      // Add avatar URL to identity
      identityData.avatarUrl = avatarUrl;
      
      // Generate content hash for the identity data
      const contentHash = generateContentHash(identityData);
      
      res.json({
        status: "success",
        identityData,
        contentHash,
        blockchainProof: CryptoJS.SHA256(JSON.stringify(identityData) + Date.now()).toString()
      });
    } catch (error) {
      console.error("API error:", error);
      res.status(500).json(API_CONFIG.response.error.serverError);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // For Vercel deployment, use the correct path to static files
    const staticPath = path.join(process.cwd(), "dist");
    app.use(express.static(staticPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(staticPath, "index.html"));
    });
  }

  // Only start the server in non-Vercel environments
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

// For Vercel deployment
export default app;

// Only start the server in non-Vercel environments
if (!process.env.VERCEL) {
  startServer();
}
