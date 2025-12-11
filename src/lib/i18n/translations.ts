/**
 * Internationalization Translations
 * Multi-language support for DomainFlipper
 * December 2025
 */

export type Language = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja' | 'ko'

export interface TranslationKeys {
  // Common
  loading: string
  error: string
  success: string
  cancel: string
  confirm: string
  save: string
  delete: string
  edit: string
  view: string
  back: string
  next: string
  previous: string
  close: string

  // Navigation
  dashboard: string
  empire: string
  vault: string
  strategies: string
  intelligence: string
  portfolio: string
  revenue: string
  risk: string
  finance: string
  swarm: string
  control: string
  production: string
  negotiations: string
  config: string
  miners: string

  // Mining
  miningEmpire: string
  startMining: string
  stopMining: string
  miningActive: string
  miningPaused: string
  gemsFound: string
  legendaryDomains: string
  miningStats: string
  minerPerformance: string

  // Domains
  domain: string
  domains: string
  domainName: string
  tld: string
  price: string
  value: string
  roi: string
  status: string
  active: string
  inactive: string
  available: string
  sold: string

  // Actions
  buy: string
  sell: string
  bid: string
  snipe: string
  list: string
  transfer: string
  escrow: string

  // Analytics
  analytics: string
  charts: string
  reports: string
  performance: string
  trends: string
  insights: string

  // Settings
  settings: string
  preferences: string
  language: string
  currency: string
  notifications: string
  security: string

  // Messages
  welcome: string
  gettingStarted: string
  configureApis: string
  apiCredentials: string
  apiConfigured: string
  apiNotConfigured: string

  // Time
  secondsAgo: string
  minutesAgo: string
  hoursAgo: string
  daysAgo: string
}

export const translations: Record<Language, TranslationKeys> = {
  en: {
    // Common
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    view: 'View',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    close: 'Close',

    // Navigation
    dashboard: 'Dashboard',
    empire: 'Empire',
    vault: 'Vault',
    strategies: 'Strategies',
    intelligence: 'Intelligence',
    portfolio: 'Portfolio',
    revenue: 'Revenue',
    risk: 'Risk',
    finance: 'Finance',
    swarm: 'Swarm',
    control: 'Control',
    production: 'Production',
    negotiations: 'Negotiations',
    config: 'Config',
    miners: 'Miners',

    // Mining
    miningEmpire: 'Mining Empire',
    startMining: 'Start Mining',
    stopMining: 'Stop Mining',
    miningActive: 'Mining Active',
    miningPaused: 'Mining Paused',
    gemsFound: 'Gems Found',
    legendaryDomains: 'Legendary Domains',
    miningStats: 'Mining Stats',
    minerPerformance: 'Miner Performance',

    // Domains
    domain: 'Domain',
    domains: 'Domains',
    domainName: 'Domain Name',
    tld: 'TLD',
    price: 'Price',
    value: 'Value',
    roi: 'ROI',
    status: 'Status',
    active: 'Active',
    inactive: 'Inactive',
    available: 'Available',
    sold: 'Sold',

    // Actions
    buy: 'Buy',
    sell: 'Sell',
    bid: 'Bid',
    snipe: 'Snipe',
    list: 'List',
    transfer: 'Transfer',
    escrow: 'Escrow',

    // Analytics
    analytics: 'Analytics',
    charts: 'Charts',
    reports: 'Reports',
    performance: 'Performance',
    trends: 'Trends',
    insights: 'Insights',

    // Settings
    settings: 'Settings',
    preferences: 'Preferences',
    language: 'Language',
    currency: 'Currency',
    notifications: 'Notifications',
    security: 'Security',

    // Messages
    welcome: 'Welcome to DomainFlipper',
    gettingStarted: 'Getting Started',
    configureApis: 'Configure APIs',
    apiCredentials: 'API Credentials',
    apiConfigured: 'API Configured',
    apiNotConfigured: 'API Not Configured',

    // Time
    secondsAgo: '{{count}} seconds ago',
    minutesAgo: '{{count}} minutes ago',
    hoursAgo: '{{count}} hours ago',
    daysAgo: '{{count}} days ago',
  },

  es: {
    // Common
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    save: 'Guardar',
    delete: 'Eliminar',
    edit: 'Editar',
    view: 'Ver',
    back: 'Atrás',
    next: 'Siguiente',
    previous: 'Anterior',
    close: 'Cerrar',

    // Navigation
    dashboard: 'Panel',
    empire: 'Imperio',
    vault: 'Bóveda',
    strategies: 'Estrategias',
    intelligence: 'Inteligencia',
    portfolio: 'Portafolio',
    revenue: 'Ingresos',
    risk: 'Riesgo',
    finance: 'Finanzas',
    swarm: 'Enjambre',
    control: 'Control',
    production: 'Producción',
    negotiations: 'Negociaciones',
    config: 'Configuración',
    miners: 'Mineros',

    // Mining
    miningEmpire: 'Imperio Minero',
    startMining: 'Iniciar Minería',
    stopMining: 'Detener Minería',
    miningActive: 'Minería Activa',
    miningPaused: 'Minería Pausada',
    gemsFound: 'Gemas Encontradas',
    legendaryDomains: 'Dominios Legendarios',
    miningStats: 'Estadísticas de Minería',
    minerPerformance: 'Rendimiento del Minero',

    // Domains
    domain: 'Dominio',
    domains: 'Dominios',
    domainName: 'Nombre del Dominio',
    tld: 'TLD',
    price: 'Precio',
    value: 'Valor',
    roi: 'ROI',
    status: 'Estado',
    active: 'Activo',
    inactive: 'Inactivo',
    available: 'Disponible',
    sold: 'Vendido',

    // Actions
    buy: 'Comprar',
    sell: 'Vender',
    bid: 'Oferta',
    snipe: 'Francotirador',
    list: 'Listar',
    transfer: 'Transferir',
    escrow: 'Fideicomiso',

    // Analytics
    analytics: 'Analítica',
    charts: 'Gráficos',
    reports: 'Reportes',
    performance: 'Rendimiento',
    trends: 'Tendencias',
    insights: 'Perspectivas',

    // Settings
    settings: 'Configuraciones',
    preferences: 'Preferencias',
    language: 'Idioma',
    currency: 'Moneda',
    notifications: 'Notificaciones',
    security: 'Seguridad',

    // Messages
    welcome: 'Bienvenido a DomainFlipper',
    gettingStarted: 'Primeros Pasos',
    configureApis: 'Configurar APIs',
    apiCredentials: 'Credenciales de API',
    apiConfigured: 'API Configurada',
    apiNotConfigured: 'API No Configurada',

    // Time
    secondsAgo: 'Hace {{count}} segundos',
    minutesAgo: 'Hace {{count}} minutos',
    hoursAgo: 'Hace {{count}} horas',
    daysAgo: 'Hace {{count}} días',
  },

  fr: {
    // Common
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    save: 'Sauvegarder',
    delete: 'Supprimer',
    edit: 'Modifier',
    view: 'Voir',
    back: 'Retour',
    next: 'Suivant',
    previous: 'Précédent',
    close: 'Fermer',

    // Navigation
    dashboard: 'Tableau de bord',
    empire: 'Empire',
    vault: 'Coffre-fort',
    strategies: 'Stratégies',
    intelligence: 'Intelligence',
    portfolio: 'Portefeuille',
    revenue: 'Revenus',
    risk: 'Risque',
    finance: 'Finance',
    swarm: 'Essaim',
    control: 'Contrôle',
    production: 'Production',
    negotiations: 'Négociations',
    config: 'Configuration',
    miners: 'Mineurs',

    // Mining
    miningEmpire: 'Empire Minier',
    startMining: 'Démarrer l\'Extraction',
    stopMining: 'Arrêter l\'Extraction',
    miningActive: 'Extraction Active',
    miningPaused: 'Extraction en Pause',
    gemsFound: 'Gemmes Trouvées',
    legendaryDomains: 'Domaines Légendaires',
    miningStats: 'Statistiques d\'Extraction',
    minerPerformance: 'Performance du Mineur',

    // Domains
    domain: 'Domaine',
    domains: 'Domaines',
    domainName: 'Nom de Domaine',
    tld: 'TLD',
    price: 'Prix',
    value: 'Valeur',
    roi: 'ROI',
    status: 'Statut',
    active: 'Actif',
    inactive: 'Inactif',
    available: 'Disponible',
    sold: 'Vendu',

    // Actions
    buy: 'Acheter',
    sell: 'Vendre',
    bid: 'Offre',
    snipe: 'Tireur d\'élite',
    list: 'Lister',
    transfer: 'Transférer',
    escrow: 'Séquestre',

    // Analytics
    analytics: 'Analytique',
    charts: 'Graphiques',
    reports: 'Rapports',
    performance: 'Performance',
    trends: 'Tendances',
    insights: 'Perspectives',

    // Settings
    settings: 'Paramètres',
    preferences: 'Préférences',
    language: 'Langue',
    currency: 'Devise',
    notifications: 'Notifications',
    security: 'Sécurité',

    // Messages
    welcome: 'Bienvenue sur DomainFlipper',
    gettingStarted: 'Premiers pas',
    configureApis: 'Configurer les APIs',
    apiCredentials: 'Identifiants API',
    apiConfigured: 'API Configurée',
    apiNotConfigured: 'API Non Configurée',

    // Time
    secondsAgo: 'Il y a {{count}} secondes',
    minutesAgo: 'Il y a {{count}} minutes',
    hoursAgo: 'Il y a {{count}} heures',
    daysAgo: 'Il y a {{count}} jours',
  },

  de: {
    // Common
    loading: 'Laden...',
    error: 'Fehler',
    success: 'Erfolg',
    cancel: 'Abbrechen',
    confirm: 'Bestätigen',
    save: 'Speichern',
    delete: 'Löschen',
    edit: 'Bearbeiten',
    view: 'Ansehen',
    back: 'Zurück',
    next: 'Weiter',
    previous: 'Vorherige',
    close: 'Schließen',

    // Navigation
    dashboard: 'Dashboard',
    empire: 'Imperium',
    vault: 'Tresor',
    strategies: 'Strategien',
    intelligence: 'Intelligenz',
    portfolio: 'Portfolio',
    revenue: 'Einnahmen',
    risk: 'Risiko',
    finance: 'Finanzen',
    swarm: 'Schwarm',
    control: 'Kontrolle',
    production: 'Produktion',
    negotiations: 'Verhandlungen',
    config: 'Konfiguration',
    miners: 'Bergleute',

    // Mining
    miningEmpire: 'Bergbau-Imperium',
    startMining: 'Bergbau starten',
    stopMining: 'Bergbau stoppen',
    miningActive: 'Bergbau aktiv',
    miningPaused: 'Bergbau pausiert',
    gemsFound: 'Edelsteine gefunden',
    legendaryDomains: 'Legendäre Domains',
    miningStats: 'Bergbau-Statistiken',
    minerPerformance: 'Bergmann-Leistung',

    // Domains
    domain: 'Domain',
    domains: 'Domains',
    domainName: 'Domain-Name',
    tld: 'TLD',
    price: 'Preis',
    value: 'Wert',
    roi: 'ROI',
    status: 'Status',
    active: 'Aktiv',
    inactive: 'Inaktiv',
    available: 'Verfügbar',
    sold: 'Verkauft',

    // Actions
    buy: 'Kaufen',
    sell: 'Verkaufen',
    bid: 'Gebot',
    snipe: 'Scharfschütze',
    list: 'Auflisten',
    transfer: 'Übertragen',
    escrow: 'Treuhand',

    // Analytics
    analytics: 'Analytik',
    charts: 'Diagramme',
    reports: 'Berichte',
    performance: 'Leistung',
    trends: 'Trends',
    insights: 'Einblicke',

    // Settings
    settings: 'Einstellungen',
    preferences: 'Präferenzen',
    language: 'Sprache',
    currency: 'Währung',
    notifications: 'Benachrichtigungen',
    security: 'Sicherheit',

    // Messages
    welcome: 'Willkommen bei DomainFlipper',
    gettingStarted: 'Erste Schritte',
    configureApis: 'APIs konfigurieren',
    apiCredentials: 'API-Anmeldedaten',
    apiConfigured: 'API konfiguriert',
    apiNotConfigured: 'API nicht konfiguriert',

    // Time
    secondsAgo: 'Vor {{count}} Sekunden',
    minutesAgo: 'Vor {{count}} Minuten',
    hoursAgo: 'Vor {{count}} Stunden',
    daysAgo: 'Vor {{count}} Tagen',
  },

  zh: {
    // Common
    loading: '加载中...',
    error: '错误',
    success: '成功',
    cancel: '取消',
    confirm: '确认',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    view: '查看',
    back: '返回',
    next: '下一步',
    previous: '上一步',
    close: '关闭',

    // Navigation
    dashboard: '仪表板',
    empire: '帝国',
    vault: '金库',
    strategies: '策略',
    intelligence: '情报',
    portfolio: '投资组合',
    revenue: '收入',
    risk: '风险',
    finance: '财务',
    swarm: '群体',
    control: '控制',
    production: '生产',
    negotiations: '谈判',
    config: '配置',
    miners: '矿工',

    // Mining
    miningEmpire: '矿业帝国',
    startMining: '开始挖矿',
    stopMining: '停止挖矿',
    miningActive: '挖矿活跃',
    miningPaused: '挖矿暂停',
    gemsFound: '发现宝石',
    legendaryDomains: '传奇域名',
    miningStats: '挖矿统计',
    minerPerformance: '矿工性能',

    // Domains
    domain: '域名',
    domains: '域名',
    domainName: '域名名称',
    tld: '顶级域名',
    price: '价格',
    value: '价值',
    roi: '投资回报率',
    status: '状态',
    active: '活跃',
    inactive: '不活跃',
    available: '可用',
    sold: '已售出',

    // Actions
    buy: '购买',
    sell: '出售',
    bid: '出价',
    snipe: '狙击',
    list: '列表',
    transfer: '转让',
    escrow: '托管',

    // Analytics
    analytics: '分析',
    charts: '图表',
    reports: '报告',
    performance: '性能',
    trends: '趋势',
    insights: '洞察',

    // Settings
    settings: '设置',
    preferences: '偏好',
    language: '语言',
    currency: '货币',
    notifications: '通知',
    security: '安全',

    // Messages
    welcome: '欢迎使用 DomainFlipper',
    gettingStarted: '入门指南',
    configureApis: '配置 API',
    apiCredentials: 'API 凭据',
    apiConfigured: 'API 已配置',
    apiNotConfigured: 'API 未配置',

    // Time
    secondsAgo: '{{count}} 秒前',
    minutesAgo: '{{count}} 分钟前',
    hoursAgo: '{{count}} 小时前',
    daysAgo: '{{count}} 天前',
  },

  ja: {
    // Common
    loading: '読み込み中...',
    error: 'エラー',
    success: '成功',
    cancel: 'キャンセル',
    confirm: '確認',
    save: '保存',
    delete: '削除',
    edit: '編集',
    view: '表示',
    back: '戻る',
    next: '次へ',
    previous: '前へ',
    close: '閉じる',

    // Navigation
    dashboard: 'ダッシュボード',
    empire: '帝国',
    vault: '金庫',
    strategies: '戦略',
    intelligence: 'インテリジェンス',
    portfolio: 'ポートフォリオ',
    revenue: '収益',
    risk: 'リスク',
    finance: '財務',
    swarm: 'スウォーム',
    control: 'コントロール',
    production: 'プロダクション',
    negotiations: '交渉',
    config: '設定',
    miners: 'マイナー',

    // Mining
    miningEmpire: '鉱業帝国',
    startMining: 'マイニング開始',
    stopMining: 'マイニング停止',
    miningActive: 'マイニング稼働中',
    miningPaused: 'マイニング一時停止',
    gemsFound: 'ジェム発見',
    legendaryDomains: '伝説のドメイン',
    miningStats: 'マイニング統計',
    minerPerformance: 'マイナー性能',

    // Domains
    domain: 'ドメイン',
    domains: 'ドメイン',
    domainName: 'ドメイン名',
    tld: 'TLD',
    price: '価格',
    value: '価値',
    roi: 'ROI',
    status: 'ステータス',
    active: 'アクティブ',
    inactive: '非アクティブ',
    available: '利用可能',
    sold: '販売済み',

    // Actions
    buy: '購入',
    sell: '販売',
    bid: '入札',
    snipe: 'スナイプ',
    list: 'リスト',
    transfer: '移転',
    escrow: 'エスクロー',

    // Analytics
    analytics: 'アナリティクス',
    charts: 'チャート',
    reports: 'レポート',
    performance: 'パフォーマンス',
    trends: 'トレンド',
    insights: 'インサイト',

    // Settings
    settings: '設定',
    preferences: 'プリファレンス',
    language: '言語',
    currency: '通貨',
    notifications: '通知',
    security: 'セキュリティ',

    // Messages
    welcome: 'DomainFlipper へようこそ',
    gettingStarted: 'はじめに',
    configureApis: 'API の設定',
    apiCredentials: 'API 認証情報',
    apiConfigured: 'API が設定されました',
    apiNotConfigured: 'API が設定されていません',

    // Time
    secondsAgo: '{{count}} 秒前',
    minutesAgo: '{{count}} 分前',
    hoursAgo: '{{count}} 時間前',
    daysAgo: '{{count}} 日前',
  },

  ko: {
    // Common
    loading: '로딩 중...',
    error: '오류',
    success: '성공',
    cancel: '취소',
    confirm: '확인',
    save: '저장',
    delete: '삭제',
    edit: '편집',
    view: '보기',
    back: '뒤로',
    next: '다음',
    previous: '이전',
    close: '닫기',

    // Navigation
    dashboard: '대시보드',
    empire: '제국',
    vault: '금고',
    strategies: '전략',
    intelligence: '인텔리전스',
    portfolio: '포트폴리오',
    revenue: '수익',
    risk: '리스크',
    finance: '금융',
    swarm: '스웜',
    control: '컨트롤',
    production: '프로덕션',
    negotiations: '협상',
    config: '설정',
    miners: '광부',

    // Mining
    miningEmpire: '광업 제국',
    startMining: '광업 시작',
    stopMining: '광업 중지',
    miningActive: '광업 활성',
    miningPaused: '광업 일시 중지',
    gemsFound: '보석 발견',
    legendaryDomains: '전설적인 도메인',
    miningStats: '광업 통계',
    minerPerformance: '광부 성능',

    // Domains
    domain: '도메인',
    domains: '도메인',
    domainName: '도메인 이름',
    tld: 'TLD',
    price: '가격',
    value: '가치',
    roi: 'ROI',
    status: '상태',
    active: '활성',
    inactive: '비활성',
    available: '사용 가능',
    sold: '판매됨',

    // Actions
    buy: '구매',
    sell: '판매',
    bid: '입찰',
    snipe: '저격',
    list: '목록',
    transfer: '이전',
    escrow: '에스크로',

    // Analytics
    analytics: '분석',
    charts: '차트',
    reports: '보고서',
    performance: '성능',
    trends: '트렌드',
    insights: '인사이트',

    // Settings
    settings: '설정',
    preferences: '환경 설정',
    language: '언어',
    currency: '통화',
    notifications: '알림',
    security: '보안',

    // Messages
    welcome: 'DomainFlipper에 오신 것을 환영합니다',
    gettingStarted: '시작하기',
    configureApis: 'API 구성',
    apiCredentials: 'API 자격 증명',
    apiConfigured: 'API 구성됨',
    apiNotConfigured: 'API 구성되지 않음',

    // Time
    secondsAgo: '{{count}}초 전',
    minutesAgo: '{{count}}분 전',
    hoursAgo: '{{count}}시간 전',
    daysAgo: '{{count}}일 전',
  },
}
