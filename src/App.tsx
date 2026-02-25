/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  Calendar, 
  Download, 
  RefreshCw, 
  History, 
  ShieldCheck,
  ChevronRight,
  Copy,
  CheckCircle2,
  Languages,
  Cpu,
  Link as LinkIcon,
  Image as ImageIcon,
  Camera,
  Hash,
  CreditCard,
  Landmark,
  FileJson,
  FileSpreadsheet,
  Layers,
  Users,
  DollarSign,
  Activity,
  Lock,
  Monitor,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

const StarsBackground = React.memo(() => {
  const stars = React.useMemo(() => Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    width: `${Math.random() * 2 + 1}px`,
    height: `${Math.random() * 2 + 1}px`,
    animationDelay: `${Math.random() * 3}s`,
    animationDuration: `${Math.random() * 3 + 2}s`
  })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((star) => (
        <div 
          key={star.id}
          className="absolute bg-white/60 rounded-full animate-pulse"
          style={{
            top: star.top,
            left: star.left,
            width: star.width,
            height: star.height,
            animationDelay: star.animationDelay,
            animationDuration: star.animationDuration
          }}
        />
      ))}
    </div>
  );
});

type Lang = 'en' | 'zh' | 'zh-TW' | 'ja' | 'ko' | 'vi' | 'ru' | 'ar' | 'th' | 'fr' | 'de';

const LANG_NAMES: Record<Lang, string> = {
  en: 'English',
  zh: '简体中文',
  'zh-TW': '繁體中文',
  ja: '日本語',
  ko: '한국어',
  vi: 'Tiếng Việt',
  ru: 'Русский',
  ar: 'العربية',
  th: 'ไทย',
  fr: 'Français',
  de: 'Deutsch'
};

interface Identity {
  fullName: string;
  gender: string;
  birthDate: string;
  address: string;
  street?: string;
  city?: string;
  state?: string;
  stateFullName?: string;
  zipCode?: string;
  county?: string;
  phone: string;
  email: string;
  occupation: string;
  companyName?: string;
  companySize?: string;
  employmentStatus?: string;
  monthlySalary?: string;
  nationalId?: string;
  passportNumber?: string;
  creditCard?: { number: string; expiry: string; cvv: string; type?: string; };
  bankAccount?: string;
  hairColor?: string;
  height?: string;
  weight?: string;
  bloodType?: string;
  username?: string;
  password?: string;
  operatingSystem?: string;
  guid?: string;
  userAgent?: string;
  education?: string;
  personalWebsite?: string;
  securityQuestion?: string;
  securityAnswer?: string;
  avatarUrl?: string;
  blockchainHash?: string;
  previousHash?: string;
  watermark?: string;
}

type Language = keyof typeof LANG_NAMES;

type Region = 'Asia' | 'Europe' | 'Americas' | 'Africa' | 'Pacific' | 'Atlantic' | 'Indian' | 'Southern' | 'Arctic';

const REGIONS: Record<Region, { name: string; zh: string; countries: { code: string; name: string; zh: string; flag: string }[] }> = {
  Asia: {
    name: 'Asia', zh: '亚洲',
    countries: [
      { code: 'CN', name: 'China', zh: '中国', flag: '🇨🇳' },
      { code: 'JP', name: 'Japan', zh: '日本', flag: '🇯🇵' },
      { code: 'KR', name: 'South Korea', zh: '韩国', flag: '🇰🇷' },
      { code: 'IN', name: 'India', zh: '印度', flag: '🇮🇳' },
      { code: 'SG', name: 'Singapore', zh: '新加坡', flag: '🇸🇬' },
      { code: 'TH', name: 'Thailand', zh: '泰国', flag: '🇹🇭' },
      { code: 'VN', name: 'Vietnam', zh: '越南', flag: '🇻🇳' },
    ]
  },
  Europe: {
    name: 'Europe', zh: '欧洲',
    countries: [
      { code: 'GB', name: 'United Kingdom', zh: '英国', flag: '🇬🇧' },
      { code: 'DE', name: 'Germany', zh: '德国', flag: '🇩🇪' },
      { code: 'FR', name: 'France', zh: '法国', flag: '🇫🇷' },
      { code: 'IT', name: 'Italy', zh: '意大利', flag: '🇮🇹' },
      { code: 'ES', name: 'Spain', zh: '西班牙', flag: '🇪🇸' },
      { code: 'RU', name: 'Russia', zh: '俄罗斯', flag: '🇷🇺' },
      { code: 'CH', name: 'Switzerland', zh: '瑞士', flag: '🇨🇭' },
    ]
  },
  Americas: {
    name: 'Americas', zh: '美洲',
    countries: [
      { code: 'US', name: 'United States', zh: '美国', flag: '🇺🇸' },
      { code: 'CA', name: 'Canada', zh: '加拿大', flag: '🇨🇦' },
      { code: 'BR', name: 'Brazil', zh: '巴西', flag: '🇧🇷' },
      { code: 'MX', name: 'Mexico', zh: '墨西哥', flag: '🇲🇽' },
      { code: 'AR', name: 'Argentina', zh: '阿根廷', flag: '🇦🇷' },
    ]
  },
  Africa: {
    name: 'Africa', zh: '非洲',
    countries: [
      { code: 'ZA', name: 'South Africa', zh: '南非', flag: '🇿🇦' },
      { code: 'NG', name: 'Nigeria', zh: '尼日利亚', flag: '🇳🇬' },
      { code: 'EG', name: 'Egypt', zh: '埃及', flag: '🇪🇬' },
      { code: 'KE', name: 'Kenya', zh: '肯尼亚', flag: '🇰🇪' },
      { code: 'MA', name: 'Morocco', zh: '摩洛哥', flag: '🇲🇦' },
    ]
  },
  Pacific: {
    name: 'Pacific Ocean', zh: '太平洋',
    countries: [
      { code: 'AU', name: 'Australia', zh: '澳大利亚', flag: '🇦🇺' },
      { code: 'NZ', name: 'New Zealand', zh: '新西兰', flag: '🇳🇿' },
      { code: 'FJ', name: 'Fiji', zh: '斐济', flag: '🇫🇯' },
      { code: 'PH', name: 'Philippines', zh: '菲律宾', flag: '🇵🇭' },
      { code: 'ID', name: 'Indonesia', zh: '印度尼西亚', flag: '🇮🇩' },
    ]
  },
  Atlantic: {
    name: 'Atlantic Ocean', zh: '大西洋',
    countries: [
      { code: 'IS', name: 'Iceland', zh: '冰岛', flag: '🇮🇸' },
      { code: 'BS', name: 'Bahamas', zh: '巴哈马', flag: '🇧🇸' },
      { code: 'CV', name: 'Cape Verde', zh: '佛得角', flag: '🇨🇻' },
      { code: 'PT', name: 'Portugal (Azores)', zh: '葡萄牙(亚速尔)', flag: '🇵🇹' },
    ]
  },
  Indian: {
    name: 'Indian Ocean', zh: '印度洋',
    countries: [
      { code: 'MV', name: 'Maldives', zh: '马尔代夫', flag: '🇲🇻' },
      { code: 'MU', name: 'Mauritius', zh: '毛里求斯', flag: '🇲🇺' },
      { code: 'SC', name: 'Seychelles', zh: '塞舌尔', flag: '🇸🇨' },
      { code: 'LK', name: 'Sri Lanka', zh: '斯里兰卡', flag: '🇱🇰' },
    ]
  },
  Southern: {
    name: 'Southern Ocean', zh: '南大洋',
    countries: [
      { code: 'AQ', name: 'Antarctica (Research)', zh: '南极洲(科考站)', flag: '🇦🇶' },
      { code: 'TF', name: 'French Southern Territories', zh: '法属南部领地', flag: '🇹🇫' },
    ]
  },
  Arctic: {
    name: 'Arctic Ocean', zh: '北冰洋',
    countries: [
      { code: 'GL', name: 'Greenland', zh: '格陵兰', flag: '🇬🇱' },
      { code: 'NO', name: 'Norway (Svalbard)', zh: '挪威(斯瓦尔巴)', flag: '🇳🇴' },
    ]
  }
};

const T: Record<Lang, any> = {
  en: {
    title: 'IdentityGen Pro',
    subtitle: 'AI-Powered Global Identity System',
    history: 'History',
    online: 'System Online',
    region: 'Target Region',
    dataSource: 'Data Source',
    quantity: 'Quantity',
    virtual: 'Virtual DB',
    real: 'Real DB',
    generate: 'Generate AI Identity',
    generating: 'AI Processing...',
    manual: 'Manual Entry',
    confirm: 'Confirm Identity',
    birthDate: 'Birth Date',
    occupation: 'Occupation',
    phone: 'Phone Number',
    email: 'Email Address',
    address: 'Physical Address',
    blockchain: 'Blockchain Proof',
    hash: 'Current Hash',
    prevHash: 'Previous Hash',
    restore: 'Restore',
    noHistory: 'No history yet',
    security: 'Security: AI Virtual Data',
    compliant: 'Blockchain Verified Uniqueness',
    avatar: 'AI Avatar',
    lifestyle: 'Lifestyle Photo',
    watermark: 'VIRTUAL IDENTITY • AI GENERATED',
    nationalId: 'National ID',
    passport: 'Passport Number',
    creditCard: 'Credit Card',
    creditCardType: 'Credit Card Type',
    creditCardNumber: 'Credit Card Number',
    creditCardExpiry: 'Expiry Date',
    creditCardCVV: 'CVV',
    bankAccount: 'Bank Account',
    selectCountry: 'Select Country',
    exportJson: 'Export JSON',
    exportExcel: 'Export Excel',
    copyAll: 'Copy All',
    entryMode: 'Entry Mode',
    fullName: 'Full Name',
    gender: 'Gender',
    street: 'Street',
    city: 'City',
    state: 'State',
    stateFullName: 'State Full Name',
    zipCode: 'Zip Code',
    county: 'County',
    companyName: 'Company Name',
    companySize: 'Company Size',
    employmentStatus: 'Employment Status',
    monthlySalary: 'Monthly Salary',
    hairColor: 'Hair Color',
    height: 'Height',
    weight: 'Weight',
    bloodType: 'Blood Type',
    username: 'Username',
    password: 'Password',
    operatingSystem: 'Operating System',
    guid: 'GUID',
    userAgent: 'User Agent',
    education: 'Education',
    personalWebsite: 'Personal Website',
    securityQuestion: 'Security Question',
    securityAnswer: 'Security Answer',
    regions: {
      Asia: 'Asia',
      Europe: 'Europe',
      Americas: 'Americas',
      Africa: 'Africa',
      Pacific: 'Pacific Ocean',
      Atlantic: 'Atlantic Ocean',
      Indian: 'Indian Ocean',
      Southern: 'Southern Ocean',
      Arctic: 'Arctic Ocean'
    },
    api: {
      access: 'API Access',
      keyGeneration: 'API Key Generation',
      keyGenerationDesc: 'Generate a unique API key to access the identity generation API. This key is required for all API requests.',
      generateKey: 'Generate API Key',
      keyImportant: 'Important: This key will only be shown once. Copy it immediately and keep it secure.',
      usageInstructions: 'API Usage Instructions',
      requestUrl: 'Request URL:',
      headers: 'Headers:',
      requestBody: 'Request Body:',
      copyRequest: 'Copy Request Body',
      requestCopied: 'Copied!',
      smartAgentIntegration: 'Smart Agent Integration',
      smartAgentDesc: 'For smart agents, simply provide the API key to the dedicated skill. The skill will handle the API requests and return the generated identity information.',
      keyExpiry: 'Important Note: The API key is valid for 3 months. After that, you\'ll need to generate a new key.'
    },
    delete: 'Delete'
  },
  zh: {
    title: '全球身份生成系统',
    subtitle: 'AI 驱动的全球虚拟身份平台',
    history: '历史记录',
    online: '系统在线',
    region: '目标区域',
    dataSource: '数据源',
    quantity: '生成数量',
    virtual: '虚拟随机库',
    real: '真实数据库',
    generate: 'AI 生成身份',
    generating: 'AI 处理中...',
    manual: '手动录入',
    confirm: '确认身份',
    birthDate: '出生日期',
    occupation: '职业',
    phone: '电话号码',
    email: '电子邮箱',
    address: '详细地址',
    blockchain: '区块链存证',
    hash: '当前哈希',
    prevHash: '前序哈希',
    restore: '恢复',
    noHistory: '暂无历史',
    security: '安全：AI 虚拟数据',
    compliant: '区块链唯一性验证',
    avatar: 'AI 头像',
    lifestyle: '生活照',
    watermark: '虚拟身份 • AI 自动生成',
    nationalId: '公民身份证号',
    passport: '护照号码',
    creditCard: '信用卡',
    creditCardType: '信用卡类型',
    creditCardNumber: '信用卡号',
    creditCardExpiry: '有效期',
    creditCardCVV: 'CVV',
    bankAccount: '银行账户',
    selectCountry: '选择国家/地区',
    exportJson: '导出 JSON',
    exportExcel: '导出 Excel',
    copyAll: '一键复制',
    entryMode: '录入模式',
    fullName: '全名',
    gender: '性别',
    street: '街道',
    city: '城市',
    state: '州/省',
    stateFullName: '州/省全称',
    zipCode: '邮编',
    county: '县/区',
    companyName: '公司名称',
    companySize: '公司规模',
    employmentStatus: '就业状态',
    monthlySalary: '月薪',
    hairColor: '发色',
    height: '身高',
    weight: '体重',
    bloodType: '血型',
    username: '用户名',
    password: '密码',
    operatingSystem: '操作系统',
    guid: '全局唯一标识',
    userAgent: '用户代理',
    education: '教育背景',
    personalWebsite: '个人网站',
    securityQuestion: '安全问题',
    securityAnswer: '安全答案',
    regions: {
      Asia: '亚洲',
      Europe: '欧洲',
      Americas: '美洲',
      Africa: '非洲',
      Pacific: '太平洋',
      Atlantic: '大西洋',
      Indian: '印度洋',
      Southern: '南大洋',
      Arctic: '北冰洋'
    },
    api: {
      access: 'API 访问',
      keyGeneration: 'API 密钥生成',
      keyGenerationDesc: '生成唯一的 API 密钥以访问身份生成 API。所有 API 请求都需要此密钥。',
      generateKey: '生成 API 密钥',
      keyImportant: '重要：此密钥只会显示一次。请立即复制并安全保存。',
      usageInstructions: 'API 使用说明',
      requestUrl: '请求 URL：',
      headers: '请求头：',
      requestBody: '请求体：',
      copyRequest: '复制请求体',
      requestCopied: '已复制！',
      smartAgentIntegration: '智能体集成',
      smartAgentDesc: '对于智能体，只需将 API 密钥提供给专用技能。该技能将处理 API 请求并返回生成的身份信息。',
      keyExpiry: '重要提示：API 密钥有效期为 3 个月。过期后，您需要生成新的密钥。'
    },
    delete: '删除'
  },
  'zh-TW': {
    title: '全球身份生成系統',
    subtitle: 'AI 驅動的全球虛擬身份平台',
    history: '歷史記錄',
    online: '系統在線',
    region: '目標區域',
    dataSource: '數據源',
    quantity: '生成數量',
    virtual: '虛擬隨機庫',
    real: '真實數據庫',
    generate: 'AI 生成身份',
    generating: 'AI 處理中...',
    manual: '手動錄入',
    confirm: '確認身份',
    birthDate: '出生日期',
    occupation: '職業',
    phone: '電話號碼',
    email: '電子郵箱',
    address: '詳細地址',
    blockchain: '區塊鏈存證',
    hash: '當前哈希',
    prevHash: '前序哈希',
    restore: '恢復',
    noHistory: '暫無歷史',
    security: '安全：AI 虛擬數據',
    compliant: '區塊鏈唯一性驗證',
    avatar: 'AI 頭像',
    lifestyle: '生活照',
    watermark: '虛擬身份 • AI 自動生成',
    nationalId: '公民身份證號',
    passport: '護照號碼',
    creditCard: '信用卡',
    creditCardType: '信用卡類型',
    creditCardNumber: '信用卡號',
    creditCardExpiry: '有效期',
    creditCardCVV: 'CVV',
    bankAccount: '銀行賬戶',
    selectCountry: '選擇國家/地區',
    exportJson: '導出 JSON',
    exportExcel: '導出 Excel',
    copyAll: '一鍵複製',
    entryMode: '錄入模式',
    fullName: '全名',
    gender: '性別',
    regions: {
      Asia: '亞洲',
      Europe: '歐洲',
      Americas: '美洲',
      Africa: '非洲',
      Pacific: '太平洋',
      Atlantic: '大西洋',
      Indian: '印度洋',
      Southern: '南大洋',
      Arctic: '北冰洋'
    }
  },
  ja: {
    title: 'グローバルID生成システム',
    subtitle: 'AI駆動の仮想プロファイル作成',
    history: '履歴',
    online: 'オンライン',
    region: '地域',
    dataSource: 'データソース',
    quantity: '数量',
    virtual: '仮想DB',
    real: 'リアルDB',
    generate: 'IDを生成',
    generating: '生成中...',
    manual: '手動入力',
    confirm: '確認',
    birthDate: '生年月日',
    occupation: '職業',
    phone: '電話番号',
    email: 'メールアドレス',
    address: '住所',
    blockchain: 'ブロックチェーン検証',
    hash: 'ブロックチェーンハッシュ',
    prevHash: '前のハッシュ',
    restore: '復元',
    noHistory: '履歴なし',
    security: 'セキュリティ：AI仮想データ',
    compliant: 'ブロックチェーン検証済み',
    avatar: 'AIアバター',
    lifestyle: 'ライフスタイル写真',
    watermark: '仮想ID • AI生成',
    nationalId: '国民ID',
    passport: 'パスポート番号',
    creditCard: 'クレジットカード',
    creditCardType: 'クレジットカード種類',
    creditCardNumber: 'クレジットカード番号',
    creditCardExpiry: '有効期限',
    creditCardCVV: 'CVV',
    bankAccount: '銀行口座',
    selectCountry: '国/地域を選択',
    exportJson: 'JSONエクスポート',
    exportExcel: 'Excelエクスポート',
    copyAll: 'すべてコピー',
    entryMode: '入力モード',
    fullName: '氏名',
    gender: '性別',
    street: 'ストリート',
    city: '都市',
    state: '州/県',
    stateFullName: '州/県名',
    zipCode: '郵便番号',
    county: '郡',
    companyName: '会社名',
    companySize: '会社規模',
    employmentStatus: '就業状態',
    monthlySalary: '月給',
    hairColor: '髪の色',
    height: '身長',
    weight: '体重',
    bloodType: '血液型',
    username: 'ユーザー名',
    password: 'パスワード',
    operatingSystem: 'オペレーティングシステム',
    guid: 'GUID',
    userAgent: 'ユーザーエージェント',
    education: '教育背景',
    personalWebsite: '個人ウェブサイト',
    securityQuestion: 'セキュリティ質問',
    securityAnswer: 'セキュリティ回答',
    regions: {
      Asia: 'アジア',
      Europe: 'ヨーロッパ',
      Americas: '南北アメリカ',
      Africa: 'アフリカ',
      Pacific: '太平洋',
      Atlantic: '大西洋',
      Indian: 'インド洋',
      Southern: '南大洋',
      Arctic: '北極海'
    },
    api: {
      access: 'API アクセス',
      keyGeneration: 'API キー生成',
      keyGenerationDesc: 'ID生成APIにアクセスするための一意のAPIキーを生成します。すべてのAPIリクエストにこのキーが必要です。',
      generateKey: 'APIキーを生成',
      keyImportant: '重要：このキーは一度しか表示されません。すぐにコピーして安全に保管してください。',
      usageInstructions: 'API使用方法',
      requestUrl: 'リクエストURL：',
      headers: 'ヘッダー：',
      requestBody: 'リクエストボディ：',
      copyRequest: 'リクエストボディをコピー',
      requestCopied: 'コピーしました！',
      smartAgentIntegration: 'スマートエージェント統合',
      smartAgentDesc: 'スマートエージェントの場合、専用スキルにAPIキーを提供するだけです。スキルがAPIリクエストを処理し、生成されたID情報を返します。',
      keyExpiry: '重要な注意：APIキーの有効期限は3か月です。期限切れ後は、新しいキーを生成する必要があります。'
    },
    delete: '削除'
  },
  ko: {
    title: '글로벌 신원 생성 시스템',
    subtitle: 'AI 기반 가상 프로필 생성',
    history: '기록',
    online: '온라인',
    region: '지역',
    dataSource: '데이터 소스',
    quantity: '수량',
    virtual: '가상 DB',
    real: '실제 DB',
    generate: '신원 생성',
    generating: '생성 중...',
    manual: '수동 입력',
    confirm: '확인',
    birthDate: '생년월일',
    occupation: '직업',
    phone: '전화번호',
    email: '이메일',
    address: '주소',
    blockchain: '블록체인 검증',
    hash: '블록체인 해시',
    prevHash: '이전 해시',
    restore: '복원',
    noHistory: '기록 없음',
    security: '보안: AI 가상 데이터',
    compliant: '블록체인 고유성 검증',
    avatar: 'AI 아바타',
    lifestyle: '라이프스타일 사진',
    watermark: '가상 신원 • AI 생성',
    nationalId: '주민등록번호',
    passport: '여권 번호',
    creditCard: '신용카드',
    creditCardType: '신용카드 종류',
    creditCardNumber: '신용카드 번호',
    creditCardExpiry: '유효기간',
    creditCardCVV: 'CVV',
    bankAccount: '은행 계좌',
    selectCountry: '국가/지역 선택',
    exportJson: 'JSON 내보내기',
    exportExcel: 'Excel 내보내기',
    copyAll: '모두 복사',
    entryMode: '입력 모드',
    fullName: '이름',
    gender: '성별',
    street: '거리',
    city: '도시',
    state: '주/도',
    stateFullName: '주/도 전체 이름',
    zipCode: '우편번호',
    county: '군/구',
    companyName: '회사 이름',
    companySize: '회사 규모',
    employmentStatus: '고용 상태',
    monthlySalary: '월급',
    hairColor: '머리 색',
    height: '키',
    weight: '몸무게',
    bloodType: '혈액형',
    username: '사용자 이름',
    password: '비밀번호',
    operatingSystem: '운영 체제',
    guid: 'GUID',
    userAgent: '사용자 에이전트',
    education: '교육 배경',
    personalWebsite: '개인 웹사이트',
    securityQuestion: '보안 질문',
    securityAnswer: '보안 답변',
    regions: {
      Asia: '아시아',
      Europe: '유럽',
      Americas: '아메리카',
      Africa: '아프리카',
      Pacific: '태평양',
      Atlantic: '대서양',
      Indian: '인도양',
      Southern: '남극해',
      Arctic: '북극해'
    },
    api: {
      access: 'API 액세스',
      keyGeneration: 'API 키 생성',
      keyGenerationDesc: '신원 생성 API에 액세스하기 위한 고유한 API 키를 생성합니다. 모든 API 요청에 이 키가 필요합니다.',
      generateKey: 'API 키 생성',
      keyImportant: '중요: 이 키는 한 번만 표시됩니다. 즉시 복사하여 안전하게 보관하십시오.',
      usageInstructions: 'API 사용 설명',
      requestUrl: '요청 URL:',
      headers: '헤더:',
      requestBody: '요청 본문:',
      copyRequest: '요청 본문 복사',
      requestCopied: '복사되었습니다！',
      smartAgentIntegration: '스마트 에이전트 통합',
      smartAgentDesc: '스마트 에이전트의 경우 전용 스킬에 API 키를 제공하기만 하면 됩니다. 스킬이 API 요청을 처리하고 생성된 신원 정보를 반환합니다.',
      keyExpiry: '중요 사항: API 키의 유효 기간은 3개월입니다. 만료 후 새로운 키를 생성해야 합니다.'
    },
    delete: '삭제'
  },
  vi: {
    title: 'Hệ thống tạo danh tính toàn cầu',
    subtitle: 'Tạo hồ sơ ảo do AI điều khiển',
    history: 'Lịch sử',
    online: 'Trực tuyến',
    region: 'Khu vực',
    dataSource: 'Nguồn dữ liệu',
    quantity: 'Số lượng',
    virtual: 'DB Ảo',
    real: 'DB Thực',
    generate: 'Tạo danh tính',
    generating: 'Đang tạo...',
    manual: 'Nhập thủ công',
    confirm: 'Xác nhận',
    birthDate: 'Ngày sinh',
    occupation: 'Nghề nghiệp',
    phone: 'Điện thoại',
    email: 'Email',
    address: 'Địa chỉ',
    blockchain: 'Xác minh Blockchain',
    hash: 'Mã băm Blockchain',
    prevHash: 'Mã băm trước',
    restore: 'Khôi phục',
    noHistory: 'Chưa có lịch sử',
    security: 'Bảo mật: Dữ liệu ảo AI',
    compliant: 'Xác minh tính duy nhất Blockchain',
    avatar: 'Ảnh đại diện AI',
    lifestyle: 'Ảnh đời thường',
    watermark: 'DANH TÍNH ẢO • AI TẠO',
    nationalId: 'CCCD/CMND',
    passport: 'Số hộ chiếu',
    creditCard: 'Thẻ tín dụng',
    creditCardType: 'Loại thẻ tín dụng',
    creditCardNumber: 'Số thẻ tín dụng',
    creditCardExpiry: 'Hạn sử dụng',
    creditCardCVV: 'CVV',
    bankAccount: 'Tài khoản ngân hàng',
    selectCountry: 'Chọn quốc gia',
    exportJson: 'Xuất JSON',
    exportExcel: 'Xuất Excel',
    copyAll: 'Sao chép tất cả',
    entryMode: 'Chế độ nhập',
    fullName: 'Họ và tên',
    gender: 'Giới tính',
    regions: {
      Asia: 'Châu Á',
      Europe: 'Châu Âu',
      Americas: 'Châu Mỹ',
      Africa: 'Châu Phi',
      Pacific: 'Dương Tây Dương',
      Atlantic: 'Đại Tây Dương',
      Indian: 'Đại Ấn Dương',
      Southern: 'Dương Nam Cực',
      Arctic: 'Dương Bắc Cực'
    }
  },
  ru: {
    title: 'Глобальная система генерации личности',
    subtitle: 'Создание виртуального профиля на базе ИИ',
    history: 'История',
    online: 'Онлайн',
    region: 'Регион',
    dataSource: 'Источник данных',
    quantity: 'Количество',
    virtual: 'Виртуальная БД',
    real: 'Реальная БД',
    generate: 'Сгенерировать',
    generating: 'Генерация...',
    manual: 'Ввод вручную',
    confirm: 'Подтвердить',
    birthDate: 'Дата рождения',
    occupation: 'Профессия',
    phone: 'Телефон',
    email: 'Email',
    address: 'Адрес',
    blockchain: 'Верификация блокчейна',
    hash: 'Хэш блокчейна',
    prevHash: 'Предыдущий хэш',
    restore: 'Восстановить',
    noHistory: 'Нет истории',
    security: 'Безопасность: Виртуальные данные ИИ',
    compliant: 'Уникальность подтверждена блокчейном',
    avatar: 'ИИ Аватар',
    lifestyle: 'Лайфстайл фото',
    watermark: 'ВИРТУАЛЬНАЯ ЛИЧНОСТЬ • СГЕНЕРИРОВАНО ИИ',
    nationalId: 'Национальный ID',
    passport: 'Номер паспорта',
    creditCard: 'Кредитная карта',
    creditCardType: 'Тип кредитной карты',
    creditCardNumber: 'Номер кредитной карты',
    creditCardExpiry: 'Срок действия',
    creditCardCVV: 'CVV',
    bankAccount: 'Банковский счет',
    selectCountry: 'Выберите страну',
    exportJson: 'Экспорт JSON',
    exportExcel: 'Экспорт Excel',
    copyAll: 'Копировать все',
    entryMode: 'Режим ввода',
    fullName: 'Полное имя',
    gender: 'Пол',
    regions: {
      Asia: 'Азия',
      Europe: 'Европа',
      Americas: 'Америка',
      Africa: 'Африка',
      Pacific: 'Тихий океан',
      Atlantic: 'Атлантический океан',
      Indian: 'Индийский океан',
      Southern: 'Южный океан',
      Arctic: 'Арктический океан'
    }
  },
  ar: {
    title: 'نظام توليد الهوية العالمي',
    subtitle: 'إنشاء ملف تعريف افتراضي مدعوم بالذكاء الاصطناعي',
    history: 'السجل',
    online: 'متصل',
    region: 'المنطقة',
    dataSource: 'مصدر البيانات',
    quantity: 'الكمية',
    virtual: 'قاعدة بيانات افتراضية',
    real: 'قاعدة بيانات حقيقية',
    generate: 'توليد الهوية',
    generating: 'جاري التوليد...',
    manual: 'إدخال يدوي',
    confirm: 'تأكيد',
    birthDate: 'تاريخ الميلاد',
    occupation: 'المهنة',
    phone: 'الهاتف',
    email: 'البريد الإلكتروني',
    address: 'العنوان',
    blockchain: 'التحقق من البلوكشين',
    hash: 'تجزئة البلوكشين',
    prevHash: 'التجزئة السابقة',
    restore: 'استعادة',
    noHistory: 'لا يوجد سجل',
    security: 'الأمان: بيانات افتراضية بالذكاء الاصطناعي',
    compliant: 'تم التحقق من التفرد عبر البلوكشين',
    avatar: 'صورة رمزية بالذكاء الاصطناعي',
    lifestyle: 'صورة نمط الحياة',
    watermark: 'هوية افتراضية • تم إنشاؤها بالذكاء الاصطناعي',
    nationalId: 'الهوية الوطنية',
    passport: 'رقم الجواز',
    creditCard: 'بطاقة ائتمان',
    creditCardType: 'نوع بطاقة الائتمان',
    creditCardNumber: 'رقم بطاقة الائتمان',
    creditCardExpiry: 'فترة الصلاحية',
    creditCardCVV: 'CVV',
    bankAccount: 'حساب بنكي',
    selectCountry: 'اختر الدولة',
    exportJson: 'تصدير JSON',
    exportExcel: 'تصدير Excel',
    copyAll: 'نسخ الكل',
    entryMode: 'وضع الإدخال',
    fullName: 'الاسم الكامل',
    gender: 'الجنس',
    regions: {
      Asia: 'آسيا',
      Europe: 'أوروبا',
      Americas: 'أمريكا',
      Africa: 'أفريقيا',
      Pacific: 'المحيط الهادئ',
      Atlantic: 'المحيط الأطلسي',
      Indian: 'المحيط الهندي',
      Southern: 'المحيط الجنوبي',
      Arctic: 'المحيط القطبي الشمالي'
    }
  },
  th: {
    title: 'ระบบสร้างตัวตนระดับโลก',
    subtitle: 'การสร้างโปรไฟล์เสมือนจริงด้วย AI',
    history: 'ประวัติ',
    online: 'ออนไลน์',
    region: 'ภูมิภาค',
    dataSource: 'แหล่งข้อมูล',
    quantity: 'จำนวน',
    virtual: 'ฐานข้อมูลเสมือน',
    real: 'ฐานข้อมูลจริง',
    generate: 'สร้างตัวตน',
    generating: 'กำลังสร้าง...',
    manual: 'ป้อนข้อมูลด้วยตนเอง',
    confirm: 'ยืนยัน',
    birthDate: 'วันเกิด',
    occupation: 'อาชีพ',
    phone: 'โทรศัพท์',
    email: 'อีเมล',
    address: 'ที่อยู่',
    blockchain: 'การตรวจสอบบล็อกเชน',
    hash: 'แฮชบล็อกเชน',
    prevHash: 'แฮชก่อนหน้า',
    restore: 'กู้คืน',
    noHistory: 'ยังไม่มีประวัติ',
    security: 'ความปลอดภัย: ข้อมูลเสมือน AI',
    compliant: 'ตรวจสอบความไม่ซ้ำกันด้วยบล็อกเชน',
    avatar: 'อวตาร AI',
    lifestyle: 'ภาพถ่ายไลฟ์สไตล์',
    watermark: 'ตัวตนเสมือน • สร้างโดย AI',
    nationalId: 'รหัสประจำตัวประชาชน',
    passport: 'หมายเลขหนังสือเดินทาง',
    creditCard: 'บัตรเครดิต',
    creditCardType: 'ประเภทบัตรเครดิต',
    creditCardNumber: 'หมายเลขบัตรเครดิต',
    creditCardExpiry: 'วันหมดอายุ',
    creditCardCVV: 'CVV',
    bankAccount: 'บัญชีธนาคาร',
    selectCountry: 'เลือกประเทศ',
    exportJson: 'ส่งออก JSON',
    exportExcel: 'ส่งออก Excel',
    copyAll: 'คัดลอกทั้งหมด',
    entryMode: 'โหมดป้อนข้อมูล',
    fullName: 'ชื่อเต็ม',
    gender: 'เพศ',
    regions: {
      Asia: 'เอเชีย',
      Europe: 'ยุโรป',
      Americas: 'อเมริกา',
      Africa: 'แอฟริกา',
      Pacific: 'มหาสมุทรแปซิฟิก',
      Atlantic: 'มหาสมุทรแอตแลนติก',
      Indian: 'มหาสมุทรอินเดีย',
      Southern: 'มหาสมุทรใต้',
      Arctic: 'มหาสมุทรอาร์กติก'
    }
  },
  fr: {
    title: 'Système Mondial de Génération d\'Identité',
    subtitle: 'Création de profil par IA',
    history: 'Historique',
    online: 'En ligne',
    region: 'Région',
    dataSource: 'Source de données',
    quantity: 'Quantité',
    virtual: 'BD Virtuelle',
    real: 'BD Réelle',
    generate: 'Générer l\'identité',
    generating: 'Génération...',
    manual: 'Saisie manuelle',
    confirm: 'Confirmer',
    birthDate: 'Date de naissance',
    occupation: 'Profession',
    phone: 'Téléphone',
    email: 'Email',
    address: 'Adresse',
    blockchain: 'Vérification Blockchain',
    hash: 'Hash Blockchain',
    prevHash: 'Hash précédent',
    restore: 'Restaurer',
    noHistory: 'Aucun historique',
    security: 'Sécurité : Données virtuelles IA',
    compliant: 'Unicité vérifiée par Blockchain',
    avatar: 'Avatar IA',
    lifestyle: 'Photo Lifestyle',
    watermark: 'IDENTITÉ VIRTUELLE • GÉNÉRÉ PAR IA',
    nationalId: 'Carte d\'identité',
    passport: 'Numéro de passeport',
    creditCard: 'Carte de crédit',
    creditCardType: 'Type de carte de crédit',
    creditCardNumber: 'Numéro de carte de crédit',
    creditCardExpiry: 'Date d\'expiration',
    creditCardCVV: 'CVV',
    bankAccount: 'Compte bancaire',
    selectCountry: 'Sélectionnez le pays',
    exportJson: 'Exporter JSON',
    exportExcel: 'Exporter Excel',
    copyAll: 'Tout copier',
    entryMode: 'Mode d\'entrée',
    fullName: 'Nom complet',
    gender: 'Genre',
    regions: {
      Asia: 'Asie',
      Europe: 'Europe',
      Americas: 'Amériques',
      Africa: 'Afrique',
      Pacific: 'Océan Pacifique',
      Atlantic: 'Océan Atlantique',
      Indian: 'Océan Indien',
      Southern: 'Océan Austral',
      Arctic: 'Océan Arctique'
    }
  },
  de: {
    title: 'Globales Identitätsgenerierungssystem',
    subtitle: 'KI-gesteuerte Erstellung virtueller Profile',
    history: 'Verlauf',
    online: 'Online',
    region: 'Region',
    dataSource: 'Datenquelle',
    quantity: 'Menge',
    virtual: 'Virtuelle DB',
    real: 'Reale DB',
    generate: 'Identität generieren',
    generating: 'Generieren...',
    manual: 'Manuelle Eingabe',
    confirm: 'Bestätigen',
    birthDate: 'Geburtsdatum',
    occupation: 'Beruf',
    phone: 'Telefon',
    email: 'E-Mail',
    address: 'Adresse',
    blockchain: 'Blockchain-Verifizierung',
    hash: 'Blockchain-Hash',
    prevHash: 'Vorheriger Hash',
    restore: 'Wiederherstellen',
    noHistory: 'Noch kein Verlauf',
    security: 'Sicherheit: KI-virtuelle Daten',
    compliant: 'Blockchain-verifizierte Einzigartigkeit',
    avatar: 'KI-Avatar',
    lifestyle: 'Lifestyle-Foto',
    watermark: 'VIRTUELLE IDENTITÄT • KI-GENERIERT',
    nationalId: 'Personalausweis',
    passport: 'Reisepassnummer',
    creditCard: 'Kreditkarte',
    creditCardType: 'Kreditkartentyp',
    creditCardNumber: 'Kreditkartennummer',
    creditCardExpiry: 'Gültigkeitsdatum',
    creditCardCVV: 'CVV',
    bankAccount: 'Bankkonto',
    selectCountry: 'Land auswählen',
    exportJson: 'JSON exportieren',
    exportExcel: 'Excel exportieren',
    copyAll: 'Alles kopieren',
    entryMode: 'Eingabemodus',
    fullName: 'Vollständiger Name',
    gender: 'Geschlecht',
    regions: {
      Asia: 'Asien',
      Europe: 'Europa',
      Americas: 'Amerika',
      Africa: 'Afrika',
      Pacific: 'Pazifischer Ozean',
      Atlantic: 'Atlantischer Ozean',
      Indian: 'Indischer Ozean',
      Southern: 'Südlicher Ozean',
      Arctic: 'Arktischer Ozean'
    }
  }
};

export default function App() {
  const [lang, setLang] = useState<Lang>('zh');
  const [region, setRegion] = useState<Region>('Asia');
  const [country, setCountry] = useState<string>('CN');
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<'virtual' | 'real'>('virtual');
  const [count, setCount] = useState<number>(1);
  const [entryMode, setEntryMode] = useState<'auto' | 'manual'>('auto');
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showApiModal, setShowApiModal] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [apiKeyGenerated, setApiKeyGenerated] = useState(false);
  const [copiedRequest, setCopiedRequest] = useState(false);

  const [manualData, setManualData] = useState<Identity>({
    fullName: '',
    gender: 'Male',
    birthDate: '',
    address: '',
    phone: '',
    email: '',
    occupation: '',
    nationalId: '',
    passportNumber: '',
    bankAccount: ''
  });

  const texts = T[lang];

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('language');
    console.log('Loaded language from localStorage:', savedLang);
    if (savedLang && Object.keys(LANG_NAMES).includes(savedLang)) {
      console.log('Setting language to:', savedLang);
      setLang(savedLang as Lang);
    } else {
      console.log('No valid language in localStorage, using default: zh');
    }
    fetchHistory();
  }, []);

  // Save language to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('language', lang);
  }, [lang]);

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setManualData(prev => ({ ...prev, [name]: value }));
  };

  const submitManual = async () => {
    setIdentities([manualData]);
    await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...manualData, country })
    });
    fetchHistory();
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error('Failed to fetch history', err);
    }
  };

  const deleteHistory = async (id: number) => {
    try {
      const res = await fetch(`/api/history/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchHistory();
      }
    } catch (err) {
      console.error('Failed to delete history', err);
    }
  };

  const generateIdentity = async () => {
    console.log('=== Starting generateIdentity function ===');
    console.log('Current state:', { country, lang, dataSource, count, loading, identities: identities.length });
    setLoading(true);
    try {
      const apiUrl = '/api/identity/generate';
      console.log('Making API request to:', apiUrl);
      console.log('Request body:', { country, lang, dataSource, count });
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country, lang, dataSource, count })
      });
      
      console.log('Response received with status:', res.status);
      
      if (!res.ok) {
        console.error('API returned error status:', res.status);
        const errorText = await res.text();
        console.error('Error response text:', errorText);
        throw new Error(`API error: ${res.status} - ${errorText}`);
      }
      
      let data = await res.json();
      console.log('Parsed response data:', data);
      console.log('Data type:', typeof data);
      console.log('Data length:', Array.isArray(data) ? data.length : 'not array');

      if (Array.isArray(data) && data.length > 0) {
        console.log('Setting identities state with', data.length, 'identities...');
        setIdentities(data);
        console.log('Identities state set successfully');
        
        // Save to history
        console.log('Saving to history...');
        for (const id of data) {
          console.log('Saving identity to history:', id.fullName);
          await fetch('/api/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...id, country })
          });
        }
        console.log('History saved, fetching updated history...');
        fetchHistory();
      } else {
        console.error('Invalid response data:', data);
        throw new Error('API returned invalid data');
      }
      console.log('=== generateIdentity function completed ===');
    } catch (err) {
      console.error('=== Generation failed with error ===', err);
      // 显示错误信息给用户
      alert('生成身份失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const exportExcel = () => {
    if (identities.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(identities.map(id => ({
      ...id,
      creditCard: id.creditCard ? `${id.creditCard.type || 'N/A'}: ${id.creditCard.number} (Exp: ${id.creditCard.expiry}, CVV: ${id.creditCard.cvv})` : ''
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Identities");
    XLSX.writeFile(wb, `identities_${country}_${Date.now()}.xlsx`);
  };

  const exportJSON = () => {
    if (identities.length === 0) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(identities, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `identities_${country}_${Date.now()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const copyAll = () => {
    if (identities.length === 0) return;
    const text = identities.map(id => `
Name: ${id.fullName}
Gender: ${id.gender}
Birth Date: ${id.birthDate}
Occupation: ${id.occupation}
Phone: ${id.phone}
Email: ${id.email}
Address: ${id.address}
Street: ${id.street || 'N/A'}
City: ${id.city || 'N/A'}
State: ${id.state || 'N/A'}
State Full Name: ${id.stateFullName || 'N/A'}
Zip Code: ${id.zipCode || 'N/A'}
County: ${id.county || 'N/A'}
National ID: ${id.nationalId || 'N/A'}
Passport: ${id.passportNumber || 'N/A'}
Bank Account: ${id.bankAccount || 'N/A'}
Credit Card: ${id.creditCard ? `${id.creditCard.type || 'N/A'}: ${id.creditCard.number} (Exp: ${id.creditCard.expiry}, CVV: ${id.creditCard.cvv})` : 'N/A'}
Company Name: ${id.companyName || 'N/A'}
Company Size: ${id.companySize || 'N/A'}
Employment Status: ${id.employmentStatus || 'N/A'}
Monthly Salary: ${id.monthlySalary || 'N/A'}
Hair Color: ${id.hairColor || 'N/A'}
Height: ${id.height || 'N/A'}
Weight: ${id.weight || 'N/A'}
Blood Type: ${id.bloodType || 'N/A'}
Username: ${id.username || 'N/A'}
Password: ${id.password || 'N/A'}
Operating System: ${id.operatingSystem || 'N/A'}
GUID: ${id.guid || 'N/A'}
User Agent: ${id.userAgent || 'N/A'}
Education: ${id.education || 'N/A'}
Personal Website: ${id.personalWebsite || 'N/A'}
Security Question: ${id.securityQuestion || 'N/A'}
Security Answer: ${id.securityAnswer || 'N/A'}
Blockchain Hash: ${id.blockchainHash || 'N/A'}
Watermark: ${id.watermark || 'N/A'}
    `).join('\n-------------------\n');
    navigator.clipboard.writeText(text);
    setCopiedField('all');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const generateApiKey = async () => {
    try {
      const response = await fetch('/api/keys/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { purpose: 'API access', timestamp: Date.now() } })
      });
      const data = await response.json();
      if (data.status === 'success') {
        setApiKey(data.apiKey);
        setApiKeyGenerated(true);
      }
    } catch (error) {
      console.error('Error generating API key:', error);
    }
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedField('apiKey');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyRequest = () => {
    const requestBody = JSON.stringify({
      "country": "US",
      "prompt": "Generate a professional identity"
    }, null, 2);
    navigator.clipboard.writeText(requestBody);
    setCopiedRequest(true);
    setTimeout(() => setCopiedRequest(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-purple-500/30 overflow-x-hidden">
      {/* Background 3D Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/5 blur-[150px] rounded-full" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-fuchsia-600/5 blur-[100px] rounded-full animate-bounce duration-[10s]" />
      </div>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-2xl border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <motion.div 
              whileHover={{ rotate: 15, scale: 1.1 }}
              className="w-12 h-12 bg-gradient-to-tr from-purple-600 via-indigo-500 to-blue-500 rounded-2xl flex items-center justify-center text-white shadow-[0_8px_32px_rgba(147,51,234,0.3)]"
            >
              <Cpu size={28} />
            </motion.div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">{texts.title}</h1>
              <p className="text-[10px] text-purple-600 font-black uppercase tracking-[0.3em]">{texts.subtitle}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-10">
            <nav className="hidden md:flex items-center gap-8">
              <button 
                onClick={() => setShowApiModal(true)}
                className="text-xs font-black uppercase tracking-widest text-gray-500 hover:text-purple-600 transition-all flex items-center gap-2 hover:scale-105"
              >
                <LinkIcon size={16} className="text-blue-500" />
                API
              </button>
              <div className="relative group">
                <button 
                  className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-purple-600 transition-all hover:scale-105"
                >
                  <Languages size={16} className="text-purple-500" />
                  {LANG_NAMES[lang]}
                </button>
                <div className="absolute top-full right-0 mt-4 w-48 bg-white/90 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                  {(Object.keys(LANG_NAMES) as Lang[]).map(l => (
                    <button
                      key={l}
                      onClick={() => setLang(l)}
                      className={`w-full text-left px-5 py-3 text-xs font-bold hover:bg-gray-50 transition-colors ${lang === l ? 'text-purple-600 bg-purple-50' : 'text-gray-600'}`}
                    >
                      {LANG_NAMES[l]}
                    </button>
                  ))}
                </div>
              </div>
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className="text-xs font-black uppercase tracking-widest text-gray-500 hover:text-purple-600 transition-all flex items-center gap-2 hover:scale-105"
              >
                <History size={16} className="text-indigo-500" />
                {texts.history}
              </button>
            </nav>
            <div className="h-8 w-px bg-gray-200" />
            <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50 rounded-full border border-emerald-200">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{texts.online}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Controls Sidebar */}
          <div className="lg:col-span-4 space-y-8 relative z-10">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/80 backdrop-blur-3xl rounded-[40px] border border-gray-100 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.05)] space-y-10"
            >
              <section className="space-y-6">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2">
                  <Globe size={14} className="text-purple-500" />
                  {texts.region}
                </label>
                
                {/* Region Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                  {(Object.keys(REGIONS) as Region[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRegion(r)}
                      className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-500 ${
                        region === r 
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 scale-105' 
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                      }`}
                    >
                      {texts.regions[r] || REGIONS[r].name}
                    </button>
                  ))}
                </div>
  
                {/* Country Selection Dropdown */}
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2">
                    <MapPin size={14} className="text-indigo-500" />
                    {texts.selectCountry}
                  </label>
                  <div className="relative group">
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-6 py-5 bg-gray-50 border border-gray-200 rounded-[24px] text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none appearance-none cursor-pointer hover:bg-gray-100 transition-all group-hover:border-purple-200 text-gray-800"
                    >
                      {REGIONS[region].countries.map((c) => (
                        <option key={c.code} value={c.code} className="bg-white text-gray-900 py-4">
                          {c.flag} {['zh', 'zh-TW'].includes(lang) ? c.zh : c.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-purple-500 transition-colors">
                      <ChevronRight size={18} className="rotate-90" />
                    </div>
                  </div>
                </div>
              </section>
  
              <section className="space-y-6">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2">
                  <Layers size={14} className="text-purple-500" />
                  {texts.dataSource}
                </label>
                <div className="flex p-2 bg-gray-100 rounded-[24px] border border-gray-200">
                  <button
                    onClick={() => setDataSource('virtual')}
                    className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all duration-500 ${
                      dataSource === 'virtual' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {texts.virtual}
                  </button>
                  <button
                    onClick={() => setDataSource('real')}
                    className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all duration-500 ${
                      dataSource === 'real' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {texts.real}
                  </button>
                </div>
              </section>

              <section className="space-y-6">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2">
                  <Hash size={14} className="text-indigo-500" />
                  {texts.quantity}
                </label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    value={count} 
                    onChange={(e) => setCount(parseInt(e.target.value))}
                    className="flex-1 accent-purple-600"
                  />
                  <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 font-black text-lg border border-purple-100">
                    {count}
                  </div>
                </div>
              </section>
  
              <section className="space-y-6">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  {texts.entryMode || 'Entry Mode'}
                </label>
                <div className="flex p-2 bg-gray-100 rounded-[24px] border border-gray-200">
                  <button
                    onClick={() => setEntryMode('auto')}
                    className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all duration-500 ${
                      entryMode === 'auto' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {texts.generate}
                  </button>
                  <button
                    onClick={() => setEntryMode('manual')}
                    className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all duration-500 ${
                      entryMode === 'manual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {texts.manual}
                  </button>
                </div>
              </section>
  
              {entryMode === 'auto' ? (
                <motion.button
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={generateIdentity}
                  disabled={loading}
                  className="w-full py-6 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 disabled:opacity-50 text-white rounded-[28px] font-black uppercase tracking-[0.2em] text-xs shadow-[0_20px_50px_rgba(147,51,234,0.3)] transition-all flex items-center justify-center gap-4 group relative overflow-hidden"
                >
                  <RefreshCw size={24} className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-1000'} />
                  <span className="relative z-10">{loading ? texts.generating : texts.generate}</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={submitManual}
                  className="w-full py-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-[28px] font-black uppercase tracking-[0.2em] text-xs shadow-[0_20px_50px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-4"
                >
                  <CheckCircle2 size={24} />
                  {texts.confirm}
                </motion.button>
              )}
            </motion.div>
          </div>

          {/* Identity Display or Manual Form */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {entryMode === 'manual' ? (
                <motion.div
                  key="manual-form"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white/80 backdrop-blur-3xl rounded-[40px] border border-gray-100 p-10 space-y-8 shadow-[0_20px_60px_rgba(0,0,0,0.05)]"
                >
                  <h2 className="text-3xl font-bold tracking-tight text-gray-900">{texts.manual}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <ManualField label={texts.fullName} name="fullName" value={manualData.fullName} onChange={handleManualChange} />
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{texts.gender}</label>
                      <select 
                        name="gender" 
                        value={manualData.gender} 
                        onChange={handleManualChange}
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none appearance-none text-gray-800"
                      >
                        <option value="Male" className="bg-white">Male / 男</option>
                        <option value="Female" className="bg-white">Female / 女</option>
                        <option value="Other" className="bg-white">Other / 其他</option>
                      </select>
                    </div>
                    <ManualField label={texts.birthDate} name="birthDate" type="date" value={manualData.birthDate} onChange={handleManualChange} />
                    <ManualField label={texts.occupation} name="occupation" value={manualData.occupation} onChange={handleManualChange} />
                    <ManualField label={texts.phone} name="phone" value={manualData.phone} onChange={handleManualChange} />
                    <ManualField label={texts.email} name="email" value={manualData.email} onChange={handleManualChange} />
                    <ManualField label={texts.nationalId} name="nationalId" value={manualData.nationalId || ''} onChange={handleManualChange} />
                    <ManualField label={texts.passport} name="passportNumber" value={manualData.passportNumber || ''} onChange={handleManualChange} />
                    <ManualField label={texts.bankAccount} name="bankAccount" value={manualData.bankAccount || ''} onChange={handleManualChange} />
                    <div className="md:col-span-2">
                      <ManualField label={texts.address} name="address" value={manualData.address} onChange={handleManualChange} />
                    </div>
                  </div>
                </motion.div>
              ) : identities.length > 0 ? (
                <motion.div
                  key="identities-list"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-12 relative z-10"
                >
                  {/* Action Bar */}
                  <div className="flex flex-wrap items-center justify-end gap-4 bg-white/80 backdrop-blur-xl p-4 rounded-[32px] border border-gray-100 shadow-sm">
                    <button onClick={exportJSON} className="flex items-center gap-2 px-6 py-3 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-2xl font-bold text-sm transition-colors">
                      <FileJson size={18} /> JSON
                    </button>
                    <button onClick={exportExcel} className="flex items-center gap-2 px-6 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-2xl font-bold text-sm transition-colors">
                      <FileSpreadsheet size={18} /> Excel
                    </button>
                    <button onClick={copyAll} className="flex items-center gap-2 px-6 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-2xl font-bold text-sm transition-colors">
                      {copiedField === 'all' ? <CheckCircle2 size={18} /> : <Copy size={18} />} 
                      {copiedField === 'all' ? 'Copied!' : 'Copy All'}
                    </button>
                  </div>

                  {identities.map((identity, index) => (
                    <motion.div
                      key={identity.blockchainHash || index}
                      initial={{ opacity: 0, scale: 0.95, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white/90 backdrop-blur-3xl rounded-[60px] border border-gray-100 shadow-[0_30px_80px_rgba(0,0,0,0.08)] overflow-hidden relative group"
                    >
                      {/* Watermark Overlay */}
                      <div className="absolute inset-0 pointer-events-none opacity-[0.03] flex items-center justify-center rotate-[-30deg] select-none mix-blend-multiply">
                        <div className="text-7xl font-black whitespace-nowrap space-y-16 text-purple-900">
                          <p>{texts.watermark}</p>
                          <p>{texts.watermark}</p>
                          <p>{texts.watermark}</p>
                        </div>
                      </div>

                      <div className="p-12 md:p-16 border-b border-gray-100 flex flex-col md:flex-row items-center gap-10 bg-gradient-to-br from-purple-50/50 to-transparent">
                        <div className="flex flex-col gap-6">
                          <motion.div 
                            whileHover={{ scale: 1.05, rotate: 3 }}
                            className="relative"
                          >
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-[40px] overflow-hidden border-4 border-white shadow-[0_20px_40px_rgba(147,51,234,0.15)] bg-gray-100">
                              {identity.avatarUrl ? (
                                <img 
                                  src={identity.avatarUrl} 
                                  alt="Avatar" 
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    if (identity.fallbackAvatarUrl) {
                                      target.src = identity.fallbackAvatarUrl;
                                    }
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <User size={48} />
                                </div>
                              )}
                            </div>
                            <div className="absolute -bottom-3 -right-3 bg-gradient-to-tr from-purple-600 to-indigo-600 p-3 rounded-2xl shadow-xl border border-white">
                              <ShieldCheck size={20} className="text-white" />
                            </div>
                          </motion.div>
                        </div>
                        
                        <div className="flex-1 text-center md:text-left space-y-3">
                          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                            <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-gray-900 leading-tight">
                              {identity.fullName}
                            </h2>
                            <span className="px-4 py-1.5 bg-purple-100 text-purple-700 text-[10px] font-black uppercase tracking-[0.3em] rounded-full border border-purple-200">
                              AI Verified
                            </span>
                          </div>
                          <p className="text-lg text-gray-500 font-medium flex items-center justify-center md:justify-start gap-3">
                            <span className="text-2xl">{REGIONS[region].countries.find(c => c.code === country)?.flag}</span>
                            {['zh', 'zh-TW'].includes(lang) ? REGIONS[region].countries.find(c => c.code === country)?.zh : REGIONS[region].countries.find(c => c.code === country)?.name} 
                            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
                            <span className="uppercase tracking-widest text-sm font-black text-gray-400">{identity.gender}</span>
                          </p>
                        </div>
                      </div>

                      <div className="p-12 md:p-16 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 relative z-10">
                        <IdentityField icon={<Calendar size={20} />} label={texts.birthDate} value={identity.birthDate} onCopy={() => copyToClipboard(identity.birthDate, `birthDate-${index}`)} isCopied={copiedField === `birthDate-${index}`} />
                        <IdentityField icon={<Briefcase size={20} />} label={texts.occupation} value={identity.occupation} onCopy={() => copyToClipboard(identity.occupation, `occupation-${index}`)} isCopied={copiedField === `occupation-${index}`} />
                        <IdentityField icon={<Phone size={20} />} label={texts.phone} value={identity.phone} onCopy={() => copyToClipboard(identity.phone, `phone-${index}`)} isCopied={copiedField === `phone-${index}`} />
                        <IdentityField icon={<Mail size={20} />} label={texts.email} value={identity.email} onCopy={() => copyToClipboard(identity.email, `email-${index}`)} isCopied={copiedField === `email-${index}`} />
                        <IdentityField icon={<ShieldCheck size={20} />} label={texts.nationalId} value={identity.nationalId || 'N/A'} onCopy={() => copyToClipboard(identity.nationalId || '', `nationalId-${index}`)} isCopied={copiedField === `nationalId-${index}`} />
                        <IdentityField icon={<Globe size={20} />} label={texts.passport} value={identity.passportNumber || 'N/A'} onCopy={() => copyToClipboard(identity.passportNumber || '', `passportNumber-${index}`)} isCopied={copiedField === `passportNumber-${index}`} />
                        <IdentityField icon={<Landmark size={20} />} label={texts.bankAccount} value={identity.bankAccount || 'N/A'} onCopy={() => copyToClipboard(identity.bankAccount || '', `bankAccount-${index}`)} isCopied={copiedField === `bankAccount-${index}`} />
                        {identity.creditCard && (
                          <>
                            <IdentityField 
                              icon={<CreditCard size={20} />} 
                              label={texts.creditCardType || 'Credit Card Type'} 
                              value={identity.creditCard.type || 'N/A'} 
                              onCopy={() => copyToClipboard(identity.creditCard?.type || '', `creditCardType-${index}`)} 
                              isCopied={copiedField === `creditCardType-${index}`} 
                            />
                            <IdentityField 
                              icon={<CreditCard size={20} />} 
                              label={texts.creditCardNumber || 'Credit Card Number'} 
                              value={identity.creditCard.number || 'N/A'} 
                              onCopy={() => copyToClipboard(identity.creditCard?.number || '', `creditCardNumber-${index}`)} 
                              isCopied={copiedField === `creditCardNumber-${index}`} 
                            />
                            <IdentityField 
                              icon={<Calendar size={20} />} 
                              label={texts.creditCardExpiry || 'Expiry Date'} 
                              value={identity.creditCard.expiry || 'N/A'} 
                              onCopy={() => copyToClipboard(identity.creditCard?.expiry || '', `creditCardExpiry-${index}`)} 
                              isCopied={copiedField === `creditCardExpiry-${index}`} 
                            />
                            <IdentityField 
                              icon={<ShieldCheck size={20} />} 
                              label={texts.creditCardCVV || 'CVV'} 
                              value={identity.creditCard.cvv || 'N/A'} 
                              onCopy={() => copyToClipboard(identity.creditCard?.cvv || '', `creditCardCVV-${index}`)} 
                              isCopied={copiedField === `creditCardCVV-${index}`} 
                            />
                          </>
                        )}
                        <div className="md:col-span-2">
                          <IdentityField icon={<MapPin size={20} />} label={texts.address} value={identity.address} onCopy={() => copyToClipboard(identity.address, `address-${index}`)} isCopied={copiedField === `address-${index}`} />
                        </div>
                        {identity.street && (
                          <IdentityField icon={<MapPin size={20} />} label={texts.street || 'Street'} value={identity.street} onCopy={() => copyToClipboard(identity.street, `street-${index}`)} isCopied={copiedField === `street-${index}`} />
                        )}
                        {identity.city && (
                          <IdentityField icon={<MapPin size={20} />} label={texts.city || 'City'} value={identity.city} onCopy={() => copyToClipboard(identity.city, `city-${index}`)} isCopied={copiedField === `city-${index}`} />
                        )}
                        {identity.state && (
                          <IdentityField icon={<MapPin size={20} />} label={texts.state || 'State'} value={identity.state} onCopy={() => copyToClipboard(identity.state, `state-${index}`)} isCopied={copiedField === `state-${index}`} />
                        )}
                        {identity.stateFullName && (
                          <IdentityField icon={<MapPin size={20} />} label={texts.stateFullName || 'State Full Name'} value={identity.stateFullName} onCopy={() => copyToClipboard(identity.stateFullName, `stateFullName-${index}`)} isCopied={copiedField === `stateFullName-${index}`} />
                        )}
                        {identity.zipCode && (
                          <IdentityField icon={<MapPin size={20} />} label={texts.zipCode || 'Zip Code'} value={identity.zipCode} onCopy={() => copyToClipboard(identity.zipCode, `zipCode-${index}`)} isCopied={copiedField === `zipCode-${index}`} />
                        )}
                        {identity.county && (
                          <IdentityField icon={<MapPin size={20} />} label={texts.county || 'County'} value={identity.county} onCopy={() => copyToClipboard(identity.county, `county-${index}`)} isCopied={copiedField === `county-${index}`} />
                        )}
                        {identity.companyName && (
                          <IdentityField icon={<Briefcase size={20} />} label={texts.companyName || 'Company Name'} value={identity.companyName} onCopy={() => copyToClipboard(identity.companyName, `companyName-${index}`)} isCopied={copiedField === `companyName-${index}`} />
                        )}
                        {identity.companySize && (
                          <IdentityField icon={<Users size={20} />} label={texts.companySize || 'Company Size'} value={identity.companySize} onCopy={() => copyToClipboard(identity.companySize, `companySize-${index}`)} isCopied={copiedField === `companySize-${index}`} />
                        )}
                        {identity.employmentStatus && (
                          <IdentityField icon={<Briefcase size={20} />} label={texts.employmentStatus || 'Employment Status'} value={identity.employmentStatus} onCopy={() => copyToClipboard(identity.employmentStatus, `employmentStatus-${index}`)} isCopied={copiedField === `employmentStatus-${index}`} />
                        )}
                        {identity.monthlySalary && (
                          <IdentityField icon={<DollarSign size={20} />} label={texts.monthlySalary || 'Monthly Salary'} value={identity.monthlySalary} onCopy={() => copyToClipboard(identity.monthlySalary, `monthlySalary-${index}`)} isCopied={copiedField === `monthlySalary-${index}`} />
                        )}
                        {identity.hairColor && (
                          <IdentityField icon={<User size={20} />} label={texts.hairColor || 'Hair Color'} value={identity.hairColor} onCopy={() => copyToClipboard(identity.hairColor, `hairColor-${index}`)} isCopied={copiedField === `hairColor-${index}`} />
                        )}
                        {identity.height && (
                          <IdentityField icon={<User size={20} />} label={texts.height || 'Height'} value={identity.height} onCopy={() => copyToClipboard(identity.height, `height-${index}`)} isCopied={copiedField === `height-${index}`} />
                        )}
                        {identity.weight && (
                          <IdentityField icon={<User size={20} />} label={texts.weight || 'Weight'} value={identity.weight} onCopy={() => copyToClipboard(identity.weight, `weight-${index}`)} isCopied={copiedField === `weight-${index}`} />
                        )}
                        {identity.bloodType && (
                          <IdentityField icon={<Activity size={20} />} label={texts.bloodType || 'Blood Type'} value={identity.bloodType} onCopy={() => copyToClipboard(identity.bloodType, `bloodType-${index}`)} isCopied={copiedField === `bloodType-${index}`} />
                        )}
                        {identity.username && (
                          <IdentityField icon={<User size={20} />} label={texts.username || 'Username'} value={identity.username} onCopy={() => copyToClipboard(identity.username, `username-${index}`)} isCopied={copiedField === `username-${index}`} />
                        )}
                        {identity.password && (
                          <IdentityField icon={<Lock size={20} />} label={texts.password || 'Password'} value={identity.password} onCopy={() => copyToClipboard(identity.password, `password-${index}`)} isCopied={copiedField === `password-${index}`} />
                        )}
                        {identity.operatingSystem && (
                          <IdentityField icon={<Monitor size={20} />} label={texts.operatingSystem || 'Operating System'} value={identity.operatingSystem} onCopy={() => copyToClipboard(identity.operatingSystem, `operatingSystem-${index}`)} isCopied={copiedField === `operatingSystem-${index}`} />
                        )}
                        {identity.guid && (
                          <IdentityField icon={<Hash size={20} />} label={texts.guid || 'GUID'} value={identity.guid} onCopy={() => copyToClipboard(identity.guid, `guid-${index}`)} isCopied={copiedField === `guid-${index}`} />
                        )}
                        {identity.userAgent && (
                          <div className="md:col-span-2">
                            <IdentityField icon={<Globe size={20} />} label={texts.userAgent || 'User Agent'} value={identity.userAgent} onCopy={() => copyToClipboard(identity.userAgent, `userAgent-${index}`)} isCopied={copiedField === `userAgent-${index}`} />
                          </div>
                        )}
                        {identity.education && (
                          <IdentityField icon={<GraduationCap size={20} />} label={texts.education || 'Education'} value={identity.education} onCopy={() => copyToClipboard(identity.education, `education-${index}`)} isCopied={copiedField === `education-${index}`} />
                        )}
                        {identity.personalWebsite && (
                          <IdentityField icon={<Globe size={20} />} label={texts.personalWebsite || 'Personal Website'} value={identity.personalWebsite} onCopy={() => copyToClipboard(identity.personalWebsite, `personalWebsite-${index}`)} isCopied={copiedField === `personalWebsite-${index}`} />
                        )}
                        {identity.securityQuestion && (
                          <div className="md:col-span-2">
                            <IdentityField icon={<ShieldCheck size={20} />} label={texts.securityQuestion || 'Security Question'} value={identity.securityQuestion} onCopy={() => copyToClipboard(identity.securityQuestion, `securityQuestion-${index}`)} isCopied={copiedField === `securityQuestion-${index}`} />
                          </div>
                        )}
                        {identity.securityAnswer && (
                          <IdentityField icon={<ShieldCheck size={20} />} label={texts.securityAnswer || 'Security Answer'} value={identity.securityAnswer} onCopy={() => copyToClipboard(identity.securityAnswer, `securityAnswer-${index}`)} isCopied={copiedField === `securityAnswer-${index}`} />
                        )}
                      </div>


                    </motion.div>
                  ))}
                </motion.div>
              ) : loading ? (
                <motion.div 
                  key="generating"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center text-gray-400 space-y-6 py-32"
                >
                  <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
                    <Cpu size={48} className="text-gray-300" />
                  </div>
                  <p className="text-sm font-black uppercase tracking-[0.3em]">{texts.generating}</p>
                </motion.div>
              ) : (
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full min-h-[600px] rounded-[48px] flex flex-col items-center justify-center text-center p-12 relative overflow-hidden bg-gray-900 border border-gray-800 shadow-2xl"
                >
                  {/* Space Background */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#1e1b4b_0%,#000000_100%)]" />
                  
                  {/* Stars */}
                  <StarsBackground />

                  {/* 3D Network Grid */}
                  <motion.div 
                    animate={{ backgroundPosition: ['0px 0px', '0px 40px'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 opacity-30 pointer-events-none"
                    style={{
                      backgroundImage: `
                        linear-gradient(to right, rgba(99, 102, 241, 0.4) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(99, 102, 241, 0.4) 1px, transparent 1px)
                      `,
                      backgroundSize: '40px 40px',
                      maskImage: 'linear-gradient(to bottom, transparent 20%, black 60%, transparent 100%)',
                      WebkitMaskImage: 'linear-gradient(to bottom, transparent 20%, black 60%, transparent 100%)',
                      transform: 'perspective(1000px) rotateX(75deg) scale(2.5) translateY(10%)',
                      transformOrigin: 'center 70%'
                    }}
                  />

                  {/* 3D Hologram Scene */}
                  <div className="relative w-64 h-64 flex items-center justify-center [perspective:1000px] z-10 mt-[-40px]">
                    <motion.div 
                      animate={{ rotateY: 360 }}
                      transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                      className="relative w-full h-full flex items-center justify-center [transform-style:preserve-3d]"
                    >
                      {/* Hologram Disc (Floor) */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full border-2 border-cyan-500/40 bg-cyan-500/10 shadow-[0_0_40px_rgba(6,182,212,0.3)] [transform:translateY(70px)_rotateX(80deg)]">
                        <div className="absolute inset-0 rounded-full border border-purple-500/50 animate-ping" style={{ animationDuration: '3s' }} />
                        <div className="absolute inset-4 rounded-full border border-cyan-400/40 border-dashed animate-[spin_10s_linear_infinite]" />
                        <div className="absolute inset-8 rounded-full border border-indigo-500/40 border-dotted animate-[spin_15s_linear_infinite_reverse]" />
                      </div>

                      {/* 3D Transparent Human */}
                      <div className="absolute bottom-1/2 left-1/2 -translate-x-1/2 translate-y-[70px] flex items-center justify-center [transform-style:preserve-3d]">
                        {/* Core */}
                        <User size={160} className="text-cyan-300 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)] opacity-90" strokeWidth={1} />
                        {/* Front Layer */}
                        <User size={160} className="absolute text-purple-400 opacity-50 blur-[1px] [transform:translateZ(15px)]" strokeWidth={1} />
                        {/* Back Layer */}
                        <User size={160} className="absolute text-blue-500 opacity-50 blur-[1px] [transform:translateZ(-15px)]" strokeWidth={1} />
                        
                        {/* Scanning Line */}
                        <motion.div 
                          animate={{ y: [-80, 80, -80] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute w-48 h-[2px] bg-cyan-300 shadow-[0_0_15px_rgba(34,211,238,1)] blur-[0.5px]"
                        />
                      </div>
                    </motion.div>
                  </div>

                  {/* Text Content */}
                  <div className="relative z-10 space-y-4 mt-8 bg-gray-900/40 backdrop-blur-sm p-6 rounded-3xl border border-white/5">
                    <h3 className="text-2xl font-bold text-white tracking-wide drop-shadow-lg flex items-center justify-center gap-3">
                      <Globe className="text-cyan-400 animate-pulse" size={24} />
                      {texts.generate}
                    </h3>
                    <p className="text-sm text-cyan-100/60 max-w-sm mx-auto leading-relaxed font-light">
                      {lang === 'zh' 
                        ? '选择目标区域和生成策略，利用 AI 引擎构建具备区块链唯一性验证的全球虚拟身份。' 
                        : 'Select a region and strategy to build a global virtual identity with blockchain-verified uniqueness using our AI engine.'}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

        {/* History Drawer */}
        <AnimatePresence>
          {showHistory && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowHistory(false)}
                className="fixed inset-0 bg-gray-900/40 backdrop-blur-md z-[60]"
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white border-l border-gray-100 shadow-2xl z-[70] flex flex-col"
              >
                <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-2xl font-bold flex items-center gap-3 text-gray-900">
                    <History size={24} className="text-purple-600" />
                    {texts.history}
                  </h2>
                  <button onClick={() => setShowHistory(false)} className="p-3 hover:bg-gray-100 rounded-2xl transition-colors text-gray-500">
                    <ChevronRight size={24} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                  {history.length > 0 ? (
                    history.map((item) => (
                      <div key={item.id} className="p-6 rounded-3xl bg-gray-50 border border-gray-100 hover:border-purple-200 transition-all group relative overflow-hidden shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {REGIONS[region].countries.find(c => c.code === item.country)?.flag} {item.country}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">{new Date(item.created_at).toLocaleTimeString()}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-gray-200">
                            {item.avatar_url && <img src={item.avatar_url} className="w-full h-full object-cover" />}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{item.full_name}</h4>
                            <p className="text-[10px] text-gray-400 font-mono truncate max-w-[180px]">{item.blockchain_hash}</p>
                          </div>
                        </div>
                        <div className="mt-4 flex gap-3">
                          <button 
                            onClick={() => {
                              setIdentities([{
                                fullName: item.full_name,
                                gender: item.gender,
                                birthDate: item.birth_date,
                                address: item.address,
                                phone: item.phone,
                                email: item.email,
                                occupation: item.occupation,
                                nationalId: item.national_id,
                                passportNumber: item.passport_number,
                                creditCard: item.credit_card ? JSON.parse(item.credit_card) : undefined,
                                bankAccount: item.bank_account,
                                avatarUrl: item.avatar_url,
                                blockchainHash: item.blockchain_hash,
                                previousHash: item.previous_hash,
                                watermark: item.watermark
                              }]);
                              setCountry(item.country);
                              setShowHistory(false);
                            }}
                            className="flex-1 py-3 bg-white hover:bg-purple-50 text-purple-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-sm border border-purple-100"
                          >
                            {texts.restore}
                          </button>
                          <button 
                            onClick={() => deleteHistory(item.id)}
                            className="flex-1 py-3 bg-white hover:bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-sm border border-red-100"
                          >
                            {texts.delete || 'Delete'}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                      <History size={64} className="mb-6 opacity-20" />
                      <p className="text-sm font-medium">{texts.noHistory}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* API Modal */}
        <AnimatePresence>
          {showApiModal && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setShowApiModal(false);
                  setApiKeyGenerated(false);
                  setApiKey('');
                }}
                className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[80]"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-[40px] border border-gray-100 shadow-2xl z-[90] overflow-hidden"
              >
                <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-2xl font-bold flex items-center gap-3 text-gray-900">
                    <LinkIcon size={24} className="text-blue-600" />
                    {texts.api.access}
                  </h2>
                  <button 
                    onClick={() => {
                      setShowApiModal(false);
                      setApiKeyGenerated(false);
                      setApiKey('');
                    }}
                    className="p-3 hover:bg-gray-100 rounded-2xl transition-colors text-gray-500"
                  >
                    <ChevronRight size={24} />
                  </button>
                </div>
                <div className="p-8 space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-900">{texts.api.keyGeneration}</h3>
                    <p className="text-sm text-gray-500">
                      {texts.api.keyGenerationDesc}
                    </p>
                    {!apiKeyGenerated ? (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={generateApiKey}
                        className="w-full py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-[28px] font-black uppercase tracking-[0.2em] text-xs shadow-[0_20px_50px_rgba(59,130,246,0.3)] transition-all flex items-center justify-center gap-4"
                      >
                        <RefreshCw size={24} />
                        {texts.api.generateKey}
                      </motion.button>
                    ) : (
                      <div className="space-y-4">
                        <div className="relative">
                          <div className="w-full px-6 py-6 bg-gray-50 border border-gray-200 rounded-[24px] text-base font-mono text-gray-800 break-all pr-20">
                            {apiKey}
                          </div>
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={copyApiKey}
                            className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-2xl transition-all ${
                              copiedField === 'apiKey' ? 'text-emerald-500 bg-emerald-50 border border-emerald-200' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent'
                            }`}
                          >
                            {copiedField === 'apiKey' ? <CheckCircle2 size={20} /> : <Copy size={20} />}
                          </motion.button>
                        </div>
                        <p className="text-xs text-gray-400">
                          <strong className="text-red-500">{texts.api.keyImportant}</strong>
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-900">{texts.api.usageInstructions}</h3>
                    <div className="p-6 bg-gray-50 border border-gray-200 rounded-[24px] font-mono text-sm text-gray-800">
                      <p className="mb-4 font-bold">{texts.api.requestUrl}</p>
                      <p className="mb-4">POST http://localhost:3003/api/external/identity</p>
                      <p className="mb-4 font-bold">{texts.api.headers}</p>
                      <p className="mb-4">X-API-Key: {apiKey || 'YOUR_API_KEY'}</p>
                      <div className="flex items-center justify-between mb-4">
                        <p className="font-bold">{texts.api.requestBody}</p>
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={copyRequest}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            copiedRequest ? 'text-emerald-500 bg-emerald-50 border border-emerald-200' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent'
                          }`}
                        >
                          {copiedRequest ? texts.api.requestCopied : texts.api.copyRequest}
                        </motion.button>
                      </div>
                      <pre className="bg-white p-4 rounded-xl text-xs">{
                        JSON.stringify({
                          "country": "US",
                          "prompt": "Generate a professional identity"
                        }, null, 2)
                      }</pre>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-900">{texts.api.smartAgentIntegration}</h3>
                    <p className="text-sm text-gray-500">
                      {texts.api.smartAgentDesc}
                    </p>
                    <div className="p-6 bg-blue-50 border border-blue-200 rounded-[24px]">
                      <p className="text-sm text-blue-700 font-medium">
                        <strong>{texts.api.keyExpiry}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-20 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white shadow-md">
                <Hash size={18} />
              </div>
              <h4 className="font-bold text-lg text-gray-900">Blockchain Identity Protocol v2.0</h4>
            </div>
            <p className="text-sm text-gray-500 max-w-md leading-relaxed">
              {lang === 'zh' 
                ? '基于 AI 引擎与分布式哈希链技术，为全球开发者提供合规、唯一且不可篡改的虚拟身份测试数据。' 
                : 'Providing compliant, unique, and immutable virtual identity test data for global developers based on AI engines and distributed hash chain technology.'}
            </p>
          </div>
          <div className="flex flex-wrap justify-center md:justify-end gap-10 text-xs font-bold text-gray-400 uppercase tracking-widest">
            <a href="#" className="hover:text-purple-600 transition-colors">API Documentation</a>
            <a href="#" className="hover:text-purple-600 transition-colors">Privacy & Compliance</a>
            <a href="#" className="hover:text-purple-600 transition-colors">OpenClaw Node</a>
          </div>
        </div>
        <div className="mt-20 pt-8 border-t border-gray-200 text-center text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">
          © 2026 IDENTITYGEN GLOBAL NETWORK • ALL RIGHTS RESERVED
        </div>
      </footer>
    </div>
  );
}

function ManualField({ label, name, value, onChange, type = 'text' }: { 
  label: string; 
  name: string; 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
}) {
  return (
    <div className="space-y-3">
      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{label}</label>
      <input 
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none transition-all text-gray-800 placeholder-gray-400"
        placeholder={`Enter ${label.toLowerCase()}`}
      />
    </div>
  );
}

function IdentityField({ icon, label, value, onCopy, isCopied }: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  onCopy: () => void; 
  isCopied: boolean; 
}) {
  return (
    <div className="space-y-4 group">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-3">
        <span className="text-purple-500 bg-purple-50 p-2 rounded-lg">{icon}</span>
        {label}
      </label>
      <div className="relative">
        <div className="w-full px-8 py-6 bg-white border border-gray-100 rounded-[32px] text-base font-bold text-gray-800 break-words pr-20 group-hover:border-purple-200 group-hover:bg-purple-50/30 transition-all duration-500 shadow-sm">
          {value}
        </div>
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onCopy}
          className={`absolute right-4 top-1/2 -translate-y-1/2 p-4 rounded-2xl transition-all ${
            isCopied ? 'text-emerald-500 bg-emerald-50 border border-emerald-200' : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50 border border-transparent'
          }`}
        >
          {isCopied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
        </motion.button>
      </div>
    </div>
  );
}
