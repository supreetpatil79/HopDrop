export interface IndianCityData {
  placeName: string;
  placeAddress: string;
  city: string;
  state: string;
  eLoc: string;
  latitude: number;
  longitude: number;
  aliases: string[];
}

export const ALL_INDIAN_CITIES: IndianCityData[] = [
  // ── Karnataka ──
  { placeName: 'Bengaluru', placeAddress: 'Bengaluru, Karnataka, India', city: 'Bengaluru', state: 'Karnataka', eLoc: 'DEMO_BLR', latitude: 12.9716, longitude: 77.5946, aliases: ['Bangalore', 'BLR', 'SBC', 'SMVT', 'YPR', 'Yeshwantpur', 'Majestic', 'Kempegowda'] },
  { placeName: 'Mysuru', placeAddress: 'Mysuru, Karnataka, India', city: 'Mysuru', state: 'Karnataka', eLoc: 'DEMO_MYQ', latitude: 12.2958, longitude: 76.6394, aliases: ['Mysore', 'MYQ', 'MYS', 'Mysuru Junction'] },
  { placeName: 'Mangaluru', placeAddress: 'Mangaluru, Karnataka, India', city: 'Mangaluru', state: 'Karnataka', eLoc: 'DEMO_IXE', latitude: 12.9141, longitude: 74.856, aliases: ['Mangalore', 'IXE', 'MAQ', 'MAJN'] },
  { placeName: 'Hubballi', placeAddress: 'Hubballi, Karnataka, India', city: 'Hubballi', state: 'Karnataka', eLoc: 'DEMO_HBX', latitude: 15.3647, longitude: 75.124, aliases: ['Hubli', 'Dharwad', 'HBX', 'UBL'] },
  { placeName: 'Belagavi', placeAddress: 'Belagavi, Karnataka, India', city: 'Belagavi', state: 'Karnataka', eLoc: 'DEMO_IXG', latitude: 15.8497, longitude: 74.4977, aliases: ['Belgaum', 'IXG', 'BGM'] },
  { placeName: 'Kalaburagi', placeAddress: 'Kalaburagi, Karnataka, India', city: 'Kalaburagi', state: 'Karnataka', eLoc: 'DEMO_GBI', latitude: 17.3297, longitude: 76.8343, aliases: ['Gulbarga', 'GBI', 'KLBG'] },
  { placeName: 'Ballari', placeAddress: 'Ballari, Karnataka, India', city: 'Ballari', state: 'Karnataka', eLoc: 'DEMO_BEP', latitude: 15.1394, longitude: 76.9214, aliases: ['Bellary', 'BAY'] },
  { placeName: 'Vijayapura', placeAddress: 'Vijayapura, Karnataka, India', city: 'Vijayapura', state: 'Karnataka', eLoc: 'DEMO_BJP', latitude: 16.8302, longitude: 75.71, aliases: ['Bijapur', 'BJP'] },
  { placeName: 'Shivamogga', placeAddress: 'Shivamogga, Karnataka, India', city: 'Shivamogga', state: 'Karnataka', eLoc: 'DEMO_SME', latitude: 13.9299, longitude: 75.5681, aliases: ['Shimoga', 'SME'] },
  { placeName: 'Tumakuru', placeAddress: 'Tumakuru, Karnataka, India', city: 'Tumakuru', state: 'Karnataka', eLoc: 'DEMO_TK', latitude: 13.3379, longitude: 77.1173, aliases: ['Tumkur', 'TK'] },
  { placeName: 'Davangere', placeAddress: 'Davangere, Karnataka, India', city: 'Davangere', state: 'Karnataka', eLoc: 'DEMO_DVG', latitude: 14.4644, longitude: 75.9218, aliases: ['Davanagere', 'DVG'] },
  { placeName: 'Udupi', placeAddress: 'Udupi, Karnataka, India', city: 'Udupi', state: 'Karnataka', eLoc: 'DEMO_UD', latitude: 13.3409, longitude: 74.7421, aliases: ['Manipal', 'UD'] },
  { placeName: 'Hassan', placeAddress: 'Hassan, Karnataka, India', city: 'Hassan', state: 'Karnataka', eLoc: 'DEMO_HAS', latitude: 13.0033, longitude: 76.1004, aliases: ['HAS'] },
  { placeName: 'Bidar', placeAddress: 'Bidar, Karnataka, India', city: 'Bidar', state: 'Karnataka', eLoc: 'DEMO_IXX', latitude: 17.9104, longitude: 77.5199, aliases: ['IXX', 'BIDR'] },
  { placeName: 'Raichur', placeAddress: 'Raichur, Karnataka, India', city: 'Raichur', state: 'Karnataka', eLoc: 'DEMO_RC', latitude: 16.2076, longitude: 77.3463, aliases: ['RC'] },
  { placeName: 'Mandya', placeAddress: 'Mandya, Karnataka, India', city: 'Mandya', state: 'Karnataka', eLoc: 'DEMO_MYA', latitude: 12.5218, longitude: 76.8951, aliases: ['Sugar City', 'MYA'] },
  { placeName: 'Chikkamagaluru', placeAddress: 'Chikkamagaluru, Karnataka, India', city: 'Chikkamagaluru', state: 'Karnataka', eLoc: 'DEMO_CKM', latitude: 13.3161, longitude: 75.772, aliases: ['Chikmagalur', 'Coffee Land'] },
  { placeName: 'Chitradurga', placeAddress: 'Chitradurga, Karnataka, India', city: 'Chitradurga', state: 'Karnataka', eLoc: 'DEMO_CTA', latitude: 14.2251, longitude: 76.398, aliases: ['CTA'] },
  { placeName: 'Kolar', placeAddress: 'Kolar, Karnataka, India', city: 'Kolar', state: 'Karnataka', eLoc: 'DEMO_KGF', latitude: 13.1378, longitude: 78.1292, aliases: ['KGF', 'Kolar Gold Fields'] },
  { placeName: 'Bagalkot', placeAddress: 'Bagalkot, Karnataka, India', city: 'Bagalkot', state: 'Karnataka', eLoc: 'DEMO_BGK', latitude: 16.1691, longitude: 75.6615, aliases: ['BGK'] },
  { placeName: 'Karwar', placeAddress: 'Karwar, Karnataka, India', city: 'Karwar', state: 'Karnataka', eLoc: 'DEMO_KAWR', latitude: 14.8136, longitude: 74.1298, aliases: ['KAWR'] },
  { placeName: 'Madikeri', placeAddress: 'Madikeri, Karnataka, India', city: 'Madikeri', state: 'Karnataka', eLoc: 'DEMO_CRG', latitude: 12.4244, longitude: 75.7382, aliases: ['Coorg', 'Mercara'] },

  // ── Maharashtra ──
  { placeName: 'Mumbai', placeAddress: 'Mumbai, Maharashtra, India', city: 'Mumbai', state: 'Maharashtra', eLoc: 'DEMO_BOM', latitude: 19.076, longitude: 72.8777, aliases: ['Bombay', 'BOM', 'CSMT', 'CST', 'BCT', 'Mumbai Central', 'Bandra', 'LTT', 'Dadar', 'Thane'] },
  { placeName: 'Pune', placeAddress: 'Pune, Maharashtra, India', city: 'Pune', state: 'Maharashtra', eLoc: 'DEMO_PNQ', latitude: 18.5204, longitude: 73.8567, aliases: ['Poona', 'PNQ', 'Shivajinagar', 'Hinjawadi'] },
  { placeName: 'Nagpur', placeAddress: 'Nagpur, Maharashtra, India', city: 'Nagpur', state: 'Maharashtra', eLoc: 'DEMO_NAG', latitude: 21.1458, longitude: 79.0882, aliases: ['NAG', 'Orange City'] },
  { placeName: 'Nashik', placeAddress: 'Nashik, Maharashtra, India', city: 'Nashik', state: 'Maharashtra', eLoc: 'DEMO_ISK', latitude: 19.9975, longitude: 73.7898, aliases: ['Nasik', 'ISK', 'NK'] },
  { placeName: 'Thane', placeAddress: 'Thane, Maharashtra, India', city: 'Thane', state: 'Maharashtra', eLoc: 'DEMO_TNA', latitude: 19.2183, longitude: 72.9781, aliases: ['TNA'] },
  { placeName: 'Navi Mumbai', placeAddress: 'Navi Mumbai, Maharashtra, India', city: 'Navi Mumbai', state: 'Maharashtra', eLoc: 'DEMO_NVM', latitude: 19.033, longitude: 73.0297, aliases: ['New Bombay', 'Vashi', 'Panvel'] },
  { placeName: 'Chhatrapati Sambhajinagar', placeAddress: 'Chhatrapati Sambhajinagar, Maharashtra, India', city: 'Chhatrapati Sambhajinagar', state: 'Maharashtra', eLoc: 'DEMO_IXU', latitude: 19.8762, longitude: 75.3433, aliases: ['Aurangabad', 'IXU', 'AWB'] },
  { placeName: 'Solapur', placeAddress: 'Solapur, Maharashtra, India', city: 'Solapur', state: 'Maharashtra', eLoc: 'DEMO_SSE', latitude: 17.6599, longitude: 75.9064, aliases: ['SUR', 'Sholapur'] },
  { placeName: 'Amravati', placeAddress: 'Amravati, Maharashtra, India', city: 'Amravati', state: 'Maharashtra', eLoc: 'DEMO_AMI', latitude: 20.9374, longitude: 77.7796, aliases: ['AMI'] },
  { placeName: 'Kolhapur', placeAddress: 'Kolhapur, Maharashtra, India', city: 'Kolhapur', state: 'Maharashtra', eLoc: 'DEMO_KLH', latitude: 16.705, longitude: 74.2433, aliases: ['KLH', 'KOP'] },
  { placeName: 'Sangli', placeAddress: 'Sangli, Maharashtra, India', city: 'Sangli', state: 'Maharashtra', eLoc: 'DEMO_SLI', latitude: 16.8524, longitude: 74.5815, aliases: ['Miraj', 'SLI'] },
  { placeName: 'Jalgaon', placeAddress: 'Jalgaon, Maharashtra, India', city: 'Jalgaon', state: 'Maharashtra', eLoc: 'DEMO_JL', latitude: 21.0077, longitude: 75.5626, aliases: ['JL'] },
  { placeName: 'Akola', placeAddress: 'Akola, Maharashtra, India', city: 'Akola', state: 'Maharashtra', eLoc: 'DEMO_AK', latitude: 20.7002, longitude: 77.0082, aliases: ['AK'] },
  { placeName: 'Latur', placeAddress: 'Latur, Maharashtra, India', city: 'Latur', state: 'Maharashtra', eLoc: 'DEMO_LTU', latitude: 18.4088, longitude: 76.5604, aliases: ['LTU', 'LUR'] },
  { placeName: 'Dhule', placeAddress: 'Dhule, Maharashtra, India', city: 'Dhule', state: 'Maharashtra', eLoc: 'DEMO_DHI', latitude: 20.9042, longitude: 74.7749, aliases: ['DHI'] },
  { placeName: 'Ahmednagar', placeAddress: 'Ahmednagar, Maharashtra, India', city: 'Ahmednagar', state: 'Maharashtra', eLoc: 'DEMO_ANG', latitude: 19.0952, longitude: 74.7496, aliases: ['Ahilyanagar', 'ANG'] },
  { placeName: 'Chandrapur', placeAddress: 'Chandrapur, Maharashtra, India', city: 'Chandrapur', state: 'Maharashtra', eLoc: 'DEMO_CD', latitude: 19.9615, longitude: 79.2961, aliases: ['CD'] },
  { placeName: 'Nanded', placeAddress: 'Nanded, Maharashtra, India', city: 'Nanded', state: 'Maharashtra', eLoc: 'DEMO_NDC', latitude: 19.1383, longitude: 77.321, aliases: ['NDC', 'NED'] },
  { placeName: 'Satara', placeAddress: 'Satara, Maharashtra, India', city: 'Satara', state: 'Maharashtra', eLoc: 'DEMO_STR', latitude: 17.6805, longitude: 73.9936, aliases: ['STR'] },
  { placeName: 'Shirdi', placeAddress: 'Shirdi, Maharashtra, India', city: 'Shirdi', state: 'Maharashtra', eLoc: 'DEMO_SAG', latitude: 19.7667, longitude: 74.4766, aliases: ['SAG', 'Kopargaon'] },

  // ── Delhi NCR & Haryana ──
  { placeName: 'Delhi', placeAddress: 'New Delhi, Delhi, India', city: 'Delhi', state: 'Delhi', eLoc: 'DEMO_DEL', latitude: 28.6139, longitude: 77.209, aliases: ['New Delhi', 'NDLS', 'DLI', 'Old Delhi', 'NZM', 'Hazrat Nizamuddin', 'ANVT', 'Anand Vihar', 'IGI', 'DEL'] },
  { placeName: 'Gurugram', placeAddress: 'Gurugram, Haryana, India', city: 'Gurugram', state: 'Haryana', eLoc: 'DEMO_GUR', latitude: 28.4595, longitude: 77.0266, aliases: ['Gurgaon', 'Cyber City', 'GUR'] },
  { placeName: 'Noida', placeAddress: 'Noida, Uttar Pradesh, India', city: 'Noida', state: 'Uttar Pradesh', eLoc: 'DEMO_NOI', latitude: 28.5355, longitude: 77.391, aliases: ['NOI', 'Sector 18', 'Sector 62'] },
  { placeName: 'Greater Noida', placeAddress: 'Greater Noida, Uttar Pradesh, India', city: 'Greater Noida', state: 'Uttar Pradesh', eLoc: 'DEMO_GNOI', latitude: 28.4744, longitude: 77.504, aliases: ['Pari Chowk', 'GNOI'] },
  { placeName: 'Faridabad', placeAddress: 'Faridabad, Haryana, India', city: 'Faridabad', state: 'Haryana', eLoc: 'DEMO_FDB', latitude: 28.4089, longitude: 77.3178, aliases: ['FDB'] },
  { placeName: 'Ghaziabad', placeAddress: 'Ghaziabad, Uttar Pradesh, India', city: 'Ghaziabad', state: 'Uttar Pradesh', eLoc: 'DEMO_GZB', latitude: 28.6692, longitude: 77.4538, aliases: ['GZB'] },
  { placeName: 'Chandigarh', placeAddress: 'Chandigarh, Punjab/Haryana, India', city: 'Chandigarh', state: 'Chandigarh', eLoc: 'DEMO_IXC', latitude: 30.7333, longitude: 76.7794, aliases: ['IXC', 'CDG', 'Mohali', 'Panchkula'] },
  { placeName: 'Panipat', placeAddress: 'Panipat, Haryana, India', city: 'Panipat', state: 'Haryana', eLoc: 'DEMO_PNP', latitude: 29.3909, longitude: 76.9635, aliases: ['PNP'] },
  { placeName: 'Ambala', placeAddress: 'Ambala, Haryana, India', city: 'Ambala', state: 'Haryana', eLoc: 'DEMO_UMB', latitude: 30.3782, longitude: 76.7767, aliases: ['Ambala Cantt', 'UMB'] },
  { placeName: 'Rohtak', placeAddress: 'Rohtak, Haryana, India', city: 'Rohtak', state: 'Haryana', eLoc: 'DEMO_ROK', latitude: 28.8955, longitude: 76.6066, aliases: ['ROK'] },
  { placeName: 'Hisar', placeAddress: 'Hisar, Haryana, India', city: 'Hisar', state: 'Haryana', eLoc: 'DEMO_HSS', latitude: 29.1492, longitude: 75.7217, aliases: ['Hissar', 'HSS'] },
  { placeName: 'Karnal', placeAddress: 'Karnal, Haryana, India', city: 'Karnal', state: 'Haryana', eLoc: 'DEMO_KUN', latitude: 29.6857, longitude: 76.9905, aliases: ['KUN'] },
  { placeName: 'Sonipat', placeAddress: 'Sonipat, Haryana, India', city: 'Sonipat', state: 'Haryana', eLoc: 'DEMO_SNP', latitude: 28.9931, longitude: 77.0151, aliases: ['Sonepat', 'SNP'] },

  // ── Tamil Nadu ──
  { placeName: 'Chennai', placeAddress: 'Chennai, Tamil Nadu, India', city: 'Chennai', state: 'Tamil Nadu', eLoc: 'DEMO_MAA', latitude: 13.0827, longitude: 80.2707, aliases: ['Madras', 'MAA', 'MAS', 'MS', 'Chennai Central', 'Egmore'] },
  { placeName: 'Coimbatore', placeAddress: 'Coimbatore, Tamil Nadu, India', city: 'Coimbatore', state: 'Tamil Nadu', eLoc: 'DEMO_CJB', latitude: 11.0168, longitude: 76.9558, aliases: ['Kovai', 'CJB', 'CBE'] },
  { placeName: 'Madurai', placeAddress: 'Madurai, Tamil Nadu, India', city: 'Madurai', state: 'Tamil Nadu', eLoc: 'DEMO_IXM', latitude: 9.9252, longitude: 78.1198, aliases: ['IXM', 'MDU', 'Temple City'] },
  { placeName: 'Tiruchirappalli', placeAddress: 'Tiruchirappalli, Tamil Nadu, India', city: 'Tiruchirappalli', state: 'Tamil Nadu', eLoc: 'DEMO_TRZ', latitude: 10.7905, longitude: 78.7047, aliases: ['Trichy', 'Tiruchi', 'TRZ', 'TPJ'] },
  { placeName: 'Salem', placeAddress: 'Salem, Tamil Nadu, India', city: 'Salem', state: 'Tamil Nadu', eLoc: 'DEMO_SXV', latitude: 11.6643, longitude: 78.146, aliases: ['SXV', 'SA'] },
  { placeName: 'Tirunelveli', placeAddress: 'Tirunelveli, Tamil Nadu, India', city: 'Tirunelveli', state: 'Tamil Nadu', eLoc: 'DEMO_TEN', latitude: 8.7139, longitude: 77.7567, aliases: ['Nellai', 'TEN'] },
  { placeName: 'Tiruppur', placeAddress: 'Tiruppur, Tamil Nadu, India', city: 'Tiruppur', state: 'Tamil Nadu', eLoc: 'DEMO_TUP', latitude: 11.1085, longitude: 77.3411, aliases: ['Tirupur', 'TUP'] },
  { placeName: 'Vellore', placeAddress: 'Vellore, Tamil Nadu, India', city: 'Vellore', state: 'Tamil Nadu', eLoc: 'DEMO_VLR', latitude: 12.9165, longitude: 79.1325, aliases: ['Katpadi', 'VLR', 'KPD'] },
  { placeName: 'Erode', placeAddress: 'Erode, Tamil Nadu, India', city: 'Erode', state: 'Tamil Nadu', eLoc: 'DEMO_ED', latitude: 11.341, longitude: 77.7172, aliases: ['ED'] },
  { placeName: 'Thoothukudi', placeAddress: 'Thoothukudi, Tamil Nadu, India', city: 'Thoothukudi', state: 'Tamil Nadu', eLoc: 'DEMO_TCR', latitude: 8.7642, longitude: 78.1348, aliases: ['Tuticorin', 'TCR', 'TN'] },
  { placeName: 'Thanjavur', placeAddress: 'Thanjavur, Tamil Nadu, India', city: 'Thanjavur', state: 'Tamil Nadu', eLoc: 'DEMO_TJ', latitude: 10.787, longitude: 79.1378, aliases: ['Tanjore', 'TJ'] },
  { placeName: 'Nagercoil', placeAddress: 'Nagercoil, Tamil Nadu, India', city: 'Nagercoil', state: 'Tamil Nadu', eLoc: 'DEMO_NCJ', latitude: 8.1833, longitude: 77.4119, aliases: ['Kanyakumari', 'NCJ', 'CAPE'] },
  { placeName: 'Kanchipuram', placeAddress: 'Kanchipuram, Tamil Nadu, India', city: 'Kanchipuram', state: 'Tamil Nadu', eLoc: 'DEMO_CJ', latitude: 12.8342, longitude: 79.7036, aliases: ['Kanchi', 'Silk City', 'CJ'] },
  { placeName: 'Udhagamandalam', placeAddress: 'Udhagamandalam, Tamil Nadu, India', city: 'Udhagamandalam', state: 'Tamil Nadu', eLoc: 'DEMO_UAM', latitude: 11.4102, longitude: 76.695, aliases: ['Ooty', 'Ootacamund', 'UAM'] },
  { placeName: 'Hosur', placeAddress: 'Hosur, Tamil Nadu, India', city: 'Hosur', state: 'Tamil Nadu', eLoc: 'DEMO_HSRA', latitude: 12.7409, longitude: 77.8253, aliases: ['HSRA'] },

  // ── Telangana & Andhra Pradesh ──
  { placeName: 'Hyderabad', placeAddress: 'Hyderabad, Telangana, India', city: 'Hyderabad', state: 'Telangana', eLoc: 'DEMO_HYD', latitude: 17.385, longitude: 78.4867, aliases: ['Secunderabad', 'HYD', 'SC', 'RGIA', 'Shamshabad', 'Cyberabad'] },
  { placeName: 'Warangal', placeAddress: 'Warangal, Telangana, India', city: 'Warangal', state: 'Telangana', eLoc: 'DEMO_WGC', latitude: 17.9689, longitude: 79.5941, aliases: ['Kazipet', 'WGC', 'KZJ'] },
  { placeName: 'Nizamabad', placeAddress: 'Nizamabad, Telangana, India', city: 'Nizamabad', state: 'Telangana', eLoc: 'DEMO_NZB', latitude: 18.6725, longitude: 78.0941, aliases: ['NZB'] },
  { placeName: 'Karimnagar', placeAddress: 'Karimnagar, Telangana, India', city: 'Karimnagar', state: 'Telangana', eLoc: 'DEMO_KRMR', latitude: 18.4386, longitude: 79.1288, aliases: ['KRMR'] },
  { placeName: 'Visakhapatnam', placeAddress: 'Visakhapatnam, Andhra Pradesh, India', city: 'Visakhapatnam', state: 'Andhra Pradesh', eLoc: 'DEMO_VTZ', latitude: 17.6868, longitude: 83.2185, aliases: ['Vizag', 'VTZ', 'VSKP', 'Waltair'] },
  { placeName: 'Vijayawada', placeAddress: 'Vijayawada, Andhra Pradesh, India', city: 'Vijayawada', state: 'Andhra Pradesh', eLoc: 'DEMO_VGA', latitude: 16.5062, longitude: 80.648, aliases: ['Bezawada', 'VGA', 'BZA'] },
  { placeName: 'Guntur', placeAddress: 'Guntur, Andhra Pradesh, India', city: 'Guntur', state: 'Andhra Pradesh', eLoc: 'DEMO_GNT', latitude: 16.3067, longitude: 80.4365, aliases: ['GNT', 'Amaravati'] },
  { placeName: 'Nellore', placeAddress: 'Nellore, Andhra Pradesh, India', city: 'Nellore', state: 'Andhra Pradesh', eLoc: 'DEMO_NLR', latitude: 14.4426, longitude: 79.9865, aliases: ['NLR'] },
  { placeName: 'Kurnool', placeAddress: 'Kurnool, Andhra Pradesh, India', city: 'Kurnool', state: 'Andhra Pradesh', eLoc: 'DEMO_KJB', latitude: 15.8281, longitude: 78.0373, aliases: ['KJB', 'KRNT'] },
  { placeName: 'Rajahmundry', placeAddress: 'Rajahmundry, Andhra Pradesh, India', city: 'Rajahmundry', state: 'Andhra Pradesh', eLoc: 'DEMO_RJA', latitude: 17.0005, longitude: 81.804, aliases: ['Rajamahendravaram', 'RJA', 'RJY'] },
  { placeName: 'Tirupati', placeAddress: 'Tirupati, Andhra Pradesh, India', city: 'Tirupati', state: 'Andhra Pradesh', eLoc: 'DEMO_TIR', latitude: 13.6288, longitude: 79.4192, aliases: ['TPTY', 'TIR', 'Tirumala'] },
  { placeName: 'Kadapa', placeAddress: 'Kadapa, Andhra Pradesh, India', city: 'Kadapa', state: 'Andhra Pradesh', eLoc: 'DEMO_CDP', latitude: 14.4673, longitude: 78.8242, aliases: ['Cuddapah', 'CDP', 'HX'] },
  { placeName: 'Anantapur', placeAddress: 'Anantapur, Andhra Pradesh, India', city: 'Anantapur', state: 'Andhra Pradesh', eLoc: 'DEMO_ATP', latitude: 14.6819, longitude: 77.6006, aliases: ['ATP'] },

  // ── West Bengal ──
  { placeName: 'Kolkata', placeAddress: 'Kolkata, West Bengal, India', city: 'Kolkata', state: 'West Bengal', eLoc: 'DEMO_CCU', latitude: 22.5726, longitude: 88.3639, aliases: ['Calcutta', 'CCU', 'HWH', 'Howrah', 'SDA', 'Sealdah', 'Dumdum'] },
  { placeName: 'Siliguri', placeAddress: 'Siliguri, West Bengal, India', city: 'Siliguri', state: 'West Bengal', eLoc: 'DEMO_IXB', latitude: 26.7271, longitude: 88.3953, aliases: ['Bagdogra', 'NJP', 'New Jalpaiguri', 'IXB'] },
  { placeName: 'Asansol', placeAddress: 'Asansol, West Bengal, India', city: 'Asansol', state: 'West Bengal', eLoc: 'DEMO_ASN', latitude: 23.6739, longitude: 86.9524, aliases: ['ASN'] },
  { placeName: 'Durgapur', placeAddress: 'Durgapur, West Bengal, India', city: 'Durgapur', state: 'West Bengal', eLoc: 'DEMO_RDP', latitude: 23.5204, longitude: 87.3119, aliases: ['RDP', 'Steel City'] },
  { placeName: 'Kharagpur', placeAddress: 'Kharagpur, West Bengal, India', city: 'Kharagpur', state: 'West Bengal', eLoc: 'DEMO_KGP', latitude: 22.346, longitude: 87.232, aliases: ['IIT Kharagpur', 'KGP'] },
  { placeName: 'Darjeeling', placeAddress: 'Darjeeling, West Bengal, India', city: 'Darjeeling', state: 'West Bengal', eLoc: 'DEMO_DJ', latitude: 27.041, longitude: 88.2663, aliases: ['DJ', 'Queen of Hills'] },

  // ── Gujarat ──
  { placeName: 'Ahmedabad', placeAddress: 'Ahmedabad, Gujarat, India', city: 'Ahmedabad', state: 'Gujarat', eLoc: 'DEMO_AMD', latitude: 23.0225, longitude: 72.5714, aliases: ['Amdavad', 'AMD', 'ADI', 'Sabarmati'] },
  { placeName: 'Surat', placeAddress: 'Surat, Gujarat, India', city: 'Surat', state: 'Gujarat', eLoc: 'DEMO_STV', latitude: 21.1702, longitude: 72.8311, aliases: ['Diamond City', 'STV', 'ST'] },
  { placeName: 'Vadodara', placeAddress: 'Vadodara, Gujarat, India', city: 'Vadodara', state: 'Gujarat', eLoc: 'DEMO_BDQ', latitude: 22.3072, longitude: 73.1812, aliases: ['Baroda', 'BDQ', 'BRC'] },
  { placeName: 'Rajkot', placeAddress: 'Rajkot, Gujarat, India', city: 'Rajkot', state: 'Gujarat', eLoc: 'DEMO_RAJ', latitude: 22.3039, longitude: 70.8022, aliases: ['RAJ', 'RJT'] },
  { placeName: 'Bhavnagar', placeAddress: 'Bhavnagar, Gujarat, India', city: 'Bhavnagar', state: 'Gujarat', eLoc: 'DEMO_BHU', latitude: 21.7645, longitude: 72.1519, aliases: ['BHU', 'BVC'] },
  { placeName: 'Jamnagar', placeAddress: 'Jamnagar, Gujarat, India', city: 'Jamnagar', state: 'Gujarat', eLoc: 'DEMO_JGA', latitude: 22.4707, longitude: 70.0577, aliases: ['JGA'] },
  { placeName: 'Gandhinagar', placeAddress: 'Gandhinagar, Gujarat, India', city: 'Gandhinagar', state: 'Gujarat', eLoc: 'DEMO_GND', latitude: 23.2156, longitude: 72.6369, aliases: ['Capital of Gujarat'] },
  { placeName: 'Anand', placeAddress: 'Anand, Gujarat, India', city: 'Anand', state: 'Gujarat', eLoc: 'DEMO_ANND', latitude: 22.5645, longitude: 72.9289, aliases: ['Milk City', 'Amul', 'ANND'] },
  { placeName: 'Vapi', placeAddress: 'Vapi, Gujarat, India', city: 'Vapi', state: 'Gujarat', eLoc: 'DEMO_VAPI', latitude: 20.3893, longitude: 72.9106, aliases: ['VAPI'] },
  { placeName: 'Bhuj', placeAddress: 'Bhuj, Gujarat, India', city: 'Bhuj', state: 'Gujarat', eLoc: 'DEMO_BHJ', latitude: 23.242, longitude: 69.6669, aliases: ['Kutch', 'BHJ'] },

  // ── Rajasthan ──
  { placeName: 'Jaipur', placeAddress: 'Jaipur, Rajasthan, India', city: 'Jaipur', state: 'Rajasthan', eLoc: 'DEMO_JAI', latitude: 26.9124, longitude: 75.7873, aliases: ['Pink City', 'JAI', 'JP'] },
  { placeName: 'Jodhpur', placeAddress: 'Jodhpur, Rajasthan, India', city: 'Jodhpur', state: 'Rajasthan', eLoc: 'DEMO_JDH', latitude: 26.2389, longitude: 73.0243, aliases: ['Blue City', 'Sun City', 'JDH', 'JU'] },
  { placeName: 'Udaipur', placeAddress: 'Udaipur, Rajasthan, India', city: 'Udaipur', state: 'Rajasthan', eLoc: 'DEMO_UDR', latitude: 24.5854, longitude: 73.7125, aliases: ['City of Lakes', 'UDR', 'UDZ'] },
  { placeName: 'Kota', placeAddress: 'Kota, Rajasthan, India', city: 'Kota', state: 'Rajasthan', eLoc: 'DEMO_KOTA', latitude: 25.2138, longitude: 75.8648, aliases: ['KOTA'] },
  { placeName: 'Bikaner', placeAddress: 'Bikaner, Rajasthan, India', city: 'Bikaner', state: 'Rajasthan', eLoc: 'DEMO_BKB', latitude: 28.0229, longitude: 73.3119, aliases: ['BKB'] },
  { placeName: 'Ajmer', placeAddress: 'Ajmer, Rajasthan, India', city: 'Ajmer', state: 'Rajasthan', eLoc: 'DEMO_AII', latitude: 26.4499, longitude: 74.6399, aliases: ['Pushkar', 'AII'] },
  { placeName: 'Jaisalmer', placeAddress: 'Jaisalmer, Rajasthan, India', city: 'Jaisalmer', state: 'Rajasthan', eLoc: 'DEMO_JSA', latitude: 26.9157, longitude: 70.9083, aliases: ['Golden City', 'JSA'] },
  { placeName: 'Alwar', placeAddress: 'Alwar, Rajasthan, India', city: 'Alwar', state: 'Rajasthan', eLoc: 'DEMO_AWR', latitude: 27.553, longitude: 76.6346, aliases: ['AWR'] },

  // ── Kerala ──
  { placeName: 'Kochi', placeAddress: 'Kochi, Kerala, India', city: 'Kochi', state: 'Kerala', eLoc: 'DEMO_COK', latitude: 9.9312, longitude: 76.2673, aliases: ['Cochin', 'Ernakulam', 'COK', 'ERS'] },
  { placeName: 'Thiruvananthapuram', placeAddress: 'Thiruvananthapuram, Kerala, India', city: 'Thiruvananthapuram', state: 'Kerala', eLoc: 'DEMO_TRV', latitude: 8.5241, longitude: 76.9366, aliases: ['Trivandrum', 'TRV', 'TVC'] },
  { placeName: 'Kozhikode', placeAddress: 'Kozhikode, Kerala, India', city: 'Kozhikode', state: 'Kerala', eLoc: 'DEMO_CCJ', latitude: 11.2588, longitude: 75.7804, aliases: ['Calicut', 'CCJ', 'CLT'] },
  { placeName: 'Thrissur', placeAddress: 'Thrissur, Kerala, India', city: 'Thrissur', state: 'Kerala', eLoc: 'DEMO_TCR_KER', latitude: 10.5276, longitude: 76.2144, aliases: ['Trichur', 'TCR'] },
  { placeName: 'Kollam', placeAddress: 'Kollam, Kerala, India', city: 'Kollam', state: 'Kerala', eLoc: 'DEMO_QLN', latitude: 8.8932, longitude: 76.6141, aliases: ['Quilon', 'QLN'] },
  { placeName: 'Alappuzha', placeAddress: 'Alappuzha, Kerala, India', city: 'Alappuzha', state: 'Kerala', eLoc: 'DEMO_ALLP', latitude: 9.4981, longitude: 76.3388, aliases: ['Alleppey', 'ALLP'] },
  { placeName: 'Palakkad', placeAddress: 'Palakkad, Kerala, India', city: 'Palakkad', state: 'Kerala', eLoc: 'DEMO_PGT', latitude: 10.7867, longitude: 76.6548, aliases: ['Palghat', 'PGT'] },
  { placeName: 'Kannur', placeAddress: 'Kannur, Kerala, India', city: 'Kannur', state: 'Kerala', eLoc: 'DEMO_CNN', latitude: 11.8745, longitude: 75.3704, aliases: ['Cannanore', 'CNN', 'CAN'] },
  { placeName: 'Kottayam', placeAddress: 'Kottayam, Kerala, India', city: 'Kottayam', state: 'Kerala', eLoc: 'DEMO_KTYM', latitude: 9.5916, longitude: 76.5222, aliases: ['KTYM'] },

  // ── Uttar Pradesh ──
  { placeName: 'Lucknow', placeAddress: 'Lucknow, Uttar Pradesh, India', city: 'Lucknow', state: 'Uttar Pradesh', eLoc: 'DEMO_LKO', latitude: 26.8467, longitude: 80.9462, aliases: ['LKO', 'Charbagh', 'Nawabs'] },
  { placeName: 'Kanpur', placeAddress: 'Kanpur, Uttar Pradesh, India', city: 'Kanpur', state: 'Uttar Pradesh', eLoc: 'DEMO_KNU', latitude: 26.4499, longitude: 80.3319, aliases: ['CNB', 'KNU'] },
  { placeName: 'Varanasi', placeAddress: 'Varanasi, Uttar Pradesh, India', city: 'Varanasi', state: 'Uttar Pradesh', eLoc: 'DEMO_VNS', latitude: 25.3176, longitude: 82.9739, aliases: ['Banaras', 'Benares', 'Kashi', 'VNS', 'BSB'] },
  { placeName: 'Agra', placeAddress: 'Agra, Uttar Pradesh, India', city: 'Agra', state: 'Uttar Pradesh', eLoc: 'DEMO_AGR', latitude: 27.1767, longitude: 78.0081, aliases: ['Taj', 'Taj Mahal', 'AGR', 'AGC'] },
  { placeName: 'Prayagraj', placeAddress: 'Prayagraj, Uttar Pradesh, India', city: 'Prayagraj', state: 'Uttar Pradesh', eLoc: 'DEMO_IXD', latitude: 25.4358, longitude: 81.8463, aliases: ['Allahabad', 'PRYJ', 'IXD', 'Sangam'] },
  { placeName: 'Meerut', placeAddress: 'Meerut, Uttar Pradesh, India', city: 'Meerut', state: 'Uttar Pradesh', eLoc: 'DEMO_MTC', latitude: 28.9845, longitude: 77.7064, aliases: ['MTC'] },
  { placeName: 'Bareilly', placeAddress: 'Bareilly, Uttar Pradesh, India', city: 'Bareilly', state: 'Uttar Pradesh', eLoc: 'DEMO_BEK', latitude: 28.367, longitude: 79.4304, aliases: ['BEK', 'BE'] },
  { placeName: 'Aligarh', placeAddress: 'Aligarh, Uttar Pradesh, India', city: 'Aligarh', state: 'Uttar Pradesh', eLoc: 'DEMO_ALJN', latitude: 27.8974, longitude: 78.088, aliases: ['ALJN'] },
  { placeName: 'Gorakhpur', placeAddress: 'Gorakhpur, Uttar Pradesh, India', city: 'Gorakhpur', state: 'Uttar Pradesh', eLoc: 'DEMO_GOP', latitude: 26.7606, longitude: 83.3732, aliases: ['GOP', 'GKP'] },
  { placeName: 'Jhansi', placeAddress: 'Jhansi, Uttar Pradesh, India', city: 'Jhansi', state: 'Uttar Pradesh', eLoc: 'DEMO_JHS', latitude: 25.4484, longitude: 78.5685, aliases: ['VGLB', 'JHS'] },
  { placeName: 'Mathura', placeAddress: 'Mathura, Uttar Pradesh, India', city: 'Mathura', state: 'Uttar Pradesh', eLoc: 'DEMO_MTJ', latitude: 27.4924, longitude: 77.6737, aliases: ['Vrindavan', 'MTJ'] },
  { placeName: 'Ayodhya', placeAddress: 'Ayodhya, Uttar Pradesh, India', city: 'Ayodhya', state: 'Uttar Pradesh', eLoc: 'DEMO_AYJ', latitude: 26.7922, longitude: 82.1998, aliases: ['Faizabad', 'AYJ', 'AY', 'Ram Mandir'] },

  // ── Punjab, Himachal, Uttarakhand, J&K ──
  { placeName: 'Ludhiana', placeAddress: 'Ludhiana, Punjab, India', city: 'Ludhiana', state: 'Punjab', eLoc: 'DEMO_LUH', latitude: 30.901, longitude: 75.8573, aliases: ['LDH', 'LUH'] },
  { placeName: 'Amritsar', placeAddress: 'Amritsar, Punjab, India', city: 'Amritsar', state: 'Punjab', eLoc: 'DEMO_ATQ', latitude: 31.634, longitude: 74.8723, aliases: ['Golden Temple', 'ATQ', 'ASR'] },
  { placeName: 'Jalandhar', placeAddress: 'Jalandhar, Punjab, India', city: 'Jalandhar', state: 'Punjab', eLoc: 'DEMO_JUC', latitude: 31.326, longitude: 75.5762, aliases: ['JUC'] },
  { placeName: 'Patiala', placeAddress: 'Patiala, Punjab, India', city: 'Patiala', state: 'Punjab', eLoc: 'DEMO_PTA', latitude: 30.3398, longitude: 76.3869, aliases: ['PTA'] },
  { placeName: 'Bathinda', placeAddress: 'Bathinda, Punjab, India', city: 'Bathinda', state: 'Punjab', eLoc: 'DEMO_BUP', latitude: 30.211, longitude: 74.9455, aliases: ['BTI', 'BUP'] },
  { placeName: 'Dehradun', placeAddress: 'Dehradun, Uttarakhand, India', city: 'Dehradun', state: 'Uttarakhand', eLoc: 'DEMO_DED', latitude: 30.3165, longitude: 78.0322, aliases: ['DDN', 'DED'] },
  { placeName: 'Haridwar', placeAddress: 'Haridwar, Uttarakhand, India', city: 'Haridwar', state: 'Uttarakhand', eLoc: 'DEMO_HW', latitude: 29.9457, longitude: 78.1642, aliases: ['Hardwar', 'HW'] },
  { placeName: 'Rishikesh', placeAddress: 'Rishikesh, Uttarakhand, India', city: 'Rishikesh', state: 'Uttarakhand', eLoc: 'DEMO_RKSH', latitude: 30.0869, longitude: 78.2676, aliases: ['RKSH', 'Yoga Capital'] },
  { placeName: 'Nainital', placeAddress: 'Nainital, Uttarakhand, India', city: 'Nainital', state: 'Uttarakhand', eLoc: 'DEMO_NTL', latitude: 29.3919, longitude: 79.4542, aliases: ['Lake City', 'NTL'] },
  { placeName: 'Shimla', placeAddress: 'Shimla, Himachal Pradesh, India', city: 'Shimla', state: 'Himachal Pradesh', eLoc: 'DEMO_SLV', latitude: 31.1048, longitude: 77.1734, aliases: ['Simla', 'SLV', 'SML'] },
  { placeName: 'Dharamsala', placeAddress: 'Dharamsala, Himachal Pradesh, India', city: 'Dharamsala', state: 'Himachal Pradesh', eLoc: 'DEMO_DHM', latitude: 32.219, longitude: 76.3234, aliases: ['McLeod Ganj', 'DHM'] },
  { placeName: 'Kullu', placeAddress: 'Kullu, Himachal Pradesh, India', city: 'Kullu', state: 'Himachal Pradesh', eLoc: 'DEMO_KUU', latitude: 31.9579, longitude: 77.1095, aliases: ['Manali', 'KUU'] },
  { placeName: 'Srinagar', placeAddress: 'Srinagar, Jammu and Kashmir, India', city: 'Srinagar', state: 'Jammu and Kashmir', eLoc: 'DEMO_SXR', latitude: 34.0837, longitude: 74.7973, aliases: ['Dal Lake', 'SXR'] },
  { placeName: 'Jammu', placeAddress: 'Jammu, Jammu and Kashmir, India', city: 'Jammu', state: 'Jammu and Kashmir', eLoc: 'DEMO_IXJ', latitude: 32.7266, longitude: 74.857, aliases: ['JAT', 'IXJ', 'Tawi'] },
  { placeName: 'Leh', placeAddress: 'Leh, Ladakh, India', city: 'Leh', state: 'Ladakh', eLoc: 'DEMO_IXL', latitude: 34.1526, longitude: 77.5771, aliases: ['Ladakh', 'IXL'] },

  // ── Madhya Pradesh & Chhattisgarh ──
  { placeName: 'Indore', placeAddress: 'Indore, Madhya Pradesh, India', city: 'Indore', state: 'Madhya Pradesh', eLoc: 'DEMO_IDR', latitude: 22.7196, longitude: 75.8577, aliases: ['Cleanest City', 'IDR', 'INDB'] },
  { placeName: 'Bhopal', placeAddress: 'Bhopal, Madhya Pradesh, India', city: 'Bhopal', state: 'Madhya Pradesh', eLoc: 'DEMO_BHO', latitude: 23.2599, longitude: 77.4126, aliases: ['BHO', 'BPL', 'Habibganj', 'Rani Kamlapati'] },
  { placeName: 'Jabalpur', placeAddress: 'Jabalpur, Madhya Pradesh, India', city: 'Jabalpur', state: 'Madhya Pradesh', eLoc: 'DEMO_JLR', latitude: 23.1815, longitude: 79.9864, aliases: ['JBP', 'JLR', 'Bhedaghat'] },
  { placeName: 'Gwalior', placeAddress: 'Gwalior, Madhya Pradesh, India', city: 'Gwalior', state: 'Madhya Pradesh', eLoc: 'DEMO_GWL', latitude: 26.2183, longitude: 78.1828, aliases: ['GWL'] },
  { placeName: 'Ujjain', placeAddress: 'Ujjain, Madhya Pradesh, India', city: 'Ujjain', state: 'Madhya Pradesh', eLoc: 'DEMO_UJN', latitude: 23.1765, longitude: 75.7885, aliases: ['Mahakaleshwar', 'UJN'] },
  { placeName: 'Raipur', placeAddress: 'Raipur, Chhattisgarh, India', city: 'Raipur', state: 'Chhattisgarh', eLoc: 'DEMO_RPR', latitude: 21.2514, longitude: 81.6296, aliases: ['RPR'] },
  { placeName: 'Bilaspur', placeAddress: 'Bilaspur, Chhattisgarh, India', city: 'Bilaspur', state: 'Chhattisgarh', eLoc: 'DEMO_PAB', latitude: 22.0797, longitude: 82.1409, aliases: ['PAB', 'BSP'] },
  { placeName: 'Bhilai', placeAddress: 'Bhilai, Chhattisgarh, India', city: 'Bhilai', state: 'Chhattisgarh', eLoc: 'DEMO_DURG', latitude: 21.1938, longitude: 81.3509, aliases: ['Durg', 'Steel City'] },

  // ── Bihar & Jharkhand ──
  { placeName: 'Patna', placeAddress: 'Patna, Bihar, India', city: 'Patna', state: 'Bihar', eLoc: 'DEMO_PAT', latitude: 25.5941, longitude: 85.1376, aliases: ['PAT', 'PNBE', 'Pataliputra'] },
  { placeName: 'Gaya', placeAddress: 'Gaya, Bihar, India', city: 'Gaya', state: 'Bihar', eLoc: 'DEMO_GAY', latitude: 24.7914, longitude: 85.0002, aliases: ['Bodh Gaya', 'GAY'] },
  { placeName: 'Muzaffarpur', placeAddress: 'Muzaffarpur, Bihar, India', city: 'Muzaffarpur', state: 'Bihar', eLoc: 'DEMO_MFP', latitude: 26.1209, longitude: 85.3647, aliases: ['MFP'] },
  { placeName: 'Bhagalpur', placeAddress: 'Bhagalpur, Bihar, India', city: 'Bhagalpur', state: 'Bihar', eLoc: 'DEMO_BGP', latitude: 25.2425, longitude: 86.9842, aliases: ['BGP', 'Silk City'] },
  { placeName: 'Ranchi', placeAddress: 'Ranchi, Jharkhand, India', city: 'Ranchi', state: 'Jharkhand', eLoc: 'DEMO_IXR', latitude: 23.3441, longitude: 85.3096, aliases: ['IXR', 'RNC'] },
  { placeName: 'Jamshedpur', placeAddress: 'Jamshedpur, Jharkhand, India', city: 'Jamshedpur', state: 'Jharkhand', eLoc: 'DEMO_IXW', latitude: 22.8046, longitude: 86.2029, aliases: ['Tatanagar', 'Steel City', 'TATA'] },
  { placeName: 'Dhanbad', placeAddress: 'Dhanbad, Jharkhand, India', city: 'Dhanbad', state: 'Jharkhand', eLoc: 'DEMO_DHN', latitude: 23.7957, longitude: 86.4304, aliases: ['Coal Capital', 'DHN'] },

  // ── Odisha ──
  { placeName: 'Bhubaneswar', placeAddress: 'Bhubaneswar, Odisha, India', city: 'Bhubaneswar', state: 'Odisha', eLoc: 'DEMO_BBI', latitude: 20.2961, longitude: 85.8245, aliases: ['Temple City', 'BBI', 'BBS'] },
  { placeName: 'Cuttack', placeAddress: 'Cuttack, Odisha, India', city: 'Cuttack', state: 'Odisha', eLoc: 'DEMO_CTC', latitude: 20.4625, longitude: 85.8828, aliases: ['Silver City', 'CTC'] },
  { placeName: 'Puri', placeAddress: 'Puri, Odisha, India', city: 'Puri', state: 'Odisha', eLoc: 'DEMO_PURI', latitude: 19.8135, longitude: 85.8312, aliases: ['Jagannath Puri', 'PURI'] },
  { placeName: 'Rourkela', placeAddress: 'Rourkela, Odisha, India', city: 'Rourkela', state: 'Odisha', eLoc: 'DEMO_RRK', latitude: 22.2604, longitude: 84.8536, aliases: ['RRK', 'ROU'] },

  // ── Northeast, Goa, Puducherry & Islands ──
  { placeName: 'Guwahati', placeAddress: 'Guwahati, Assam, India', city: 'Guwahati', state: 'Assam', eLoc: 'DEMO_GAU', latitude: 26.1445, longitude: 91.7362, aliases: ['GAU', 'GHY', 'Dispur'] },
  { placeName: 'Silchar', placeAddress: 'Silchar, Assam, India', city: 'Silchar', state: 'Assam', eLoc: 'DEMO_IXS', latitude: 24.8333, longitude: 92.7789, aliases: ['IXS'] },
  { placeName: 'Agartala', placeAddress: 'Agartala, Tripura, India', city: 'Agartala', state: 'Tripura', eLoc: 'DEMO_IXA', latitude: 23.8315, longitude: 91.2868, aliases: ['IXA'] },
  { placeName: 'Shillong', placeAddress: 'Shillong, Meghalaya, India', city: 'Shillong', state: 'Meghalaya', eLoc: 'DEMO_SHL', latitude: 25.5788, longitude: 91.8933, aliases: ['Scotland of East', 'SHL'] },
  { placeName: 'Imphal', placeAddress: 'Imphal, Manipur, India', city: 'Imphal', state: 'Manipur', eLoc: 'DEMO_IMF', latitude: 24.817, longitude: 93.9368, aliases: ['IMF'] },
  { placeName: 'Aizawl', placeAddress: 'Aizawl, Mizoram, India', city: 'Aizawl', state: 'Mizoram', eLoc: 'DEMO_AJL', latitude: 23.7271, longitude: 92.7176, aliases: ['AJL'] },
  { placeName: 'Dimapur', placeAddress: 'Dimapur, Nagaland, India', city: 'Dimapur', state: 'Nagaland', eLoc: 'DEMO_DMU', latitude: 25.9068, longitude: 93.7273, aliases: ['DMU'] },
  { placeName: 'Gangtok', placeAddress: 'Gangtok, Sikkim, India', city: 'Gangtok', state: 'Sikkim', eLoc: 'DEMO_PYG', latitude: 27.3389, longitude: 88.6065, aliases: ['Pakyong'] },
  { placeName: 'Goa (Panaji)', placeAddress: 'Panaji, Goa, India', city: 'Goa', state: 'Goa', eLoc: 'DEMO_GOI', latitude: 15.4909, longitude: 73.8278, aliases: ['Goa', 'Panjim', 'Margao', 'Madgaon', 'Vasco', 'Mopa', 'GOI', 'GOX', 'MAO'] },
  { placeName: 'Puducherry', placeAddress: 'Puducherry, India', city: 'Puducherry', state: 'Puducherry', eLoc: 'DEMO_PNY', latitude: 11.9416, longitude: 79.8083, aliases: ['Pondicherry', 'PNY', 'White Town'] },
  { placeName: 'Port Blair', placeAddress: 'Port Blair, Andaman and Nicobar Islands, India', city: 'Port Blair', state: 'Andaman and Nicobar Islands', eLoc: 'DEMO_IXZ', latitude: 11.6234, longitude: 92.7265, aliases: ['Andaman', 'IXZ'] }
];

export function searchIndianCities(query: string, limit = 12): IndianCityData[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return ALL_INDIAN_CITIES.slice(0, limit);
  }

  const exactMatches: IndianCityData[] = [];
  const prefixMatches: IndianCityData[] = [];
  const aliasMatches: IndianCityData[] = [];
  const containsMatches: IndianCityData[] = [];

  for (const city of ALL_INDIAN_CITIES) {
    const name = city.placeName.toLowerCase();
    const cityName = city.city.toLowerCase();
    const address = city.placeAddress.toLowerCase();
    const state = city.state.toLowerCase();
    const aliases = city.aliases.map((a) => a.toLowerCase());

    if (name === q || cityName === q) {
      exactMatches.push(city);
    } else if (name.startsWith(q) || cityName.startsWith(q)) {
      prefixMatches.push(city);
    } else if (aliases.some((a) => a === q || a.startsWith(q))) {
      aliasMatches.push(city);
    } else if (name.includes(q) || address.includes(q) || state.includes(q) || aliases.some((a) => a.includes(q))) {
      containsMatches.push(city);
    }
  }

  const combined = [...exactMatches, ...prefixMatches, ...aliasMatches, ...containsMatches];
  const seen = new Set<string>();
  const deduped: IndianCityData[] = [];

  for (const c of combined) {
    if (!seen.has(c.eLoc)) {
      seen.add(c.eLoc);
      deduped.push(c);
      if (deduped.length >= limit) {
        break;
      }
    }
  }

  return deduped;
}
