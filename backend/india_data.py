"""Indian states, districts (major locations) and crop list for the Advisor."""

# 28 states + 8 UTs with major districts / place names (curated, non-exhaustive but broad)
INDIA_STATES = {
    "Andhra Pradesh": ["Anantapur", "Chittoor", "East Godavari", "Guntur", "Krishna", "Kurnool", "Prakasam", "Nellore", "Srikakulam", "Visakhapatnam", "Vizianagaram", "West Godavari", "Kadapa"],
    "Arunachal Pradesh": ["Itanagar", "Tawang", "West Kameng", "East Kameng", "Papum Pare", "Lower Subansiri", "Upper Subansiri", "West Siang", "East Siang", "Changlang", "Tirap"],
    "Assam": ["Guwahati", "Dibrugarh", "Silchar", "Jorhat", "Tezpur", "Nagaon", "Tinsukia", "Barpeta", "Bongaigaon", "Golaghat", "Karimganj", "Sivasagar"],
    "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia", "Darbhanga", "Bihar Sharif", "Arrah", "Begusarai", "Katihar", "Munger", "Chhapra"],
    "Chhattisgarh": ["Raipur", "Bilaspur", "Durg", "Bhilai", "Korba", "Rajnandgaon", "Jagdalpur", "Ambikapur", "Raigarh", "Dhamtari", "Mahasamund"],
    "Goa": ["Panaji", "Margao", "Mapusa", "Ponda", "Vasco da Gama", "Bicholim", "Curchorem"],
    "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Junagadh", "Gandhinagar", "Anand", "Kutch", "Mehsana", "Navsari"],
    "Haryana": ["Chandigarh", "Faridabad", "Gurugram", "Panipat", "Ambala", "Yamunanagar", "Rohtak", "Hisar", "Karnal", "Sonipat", "Panchkula", "Kurukshetra"],
    "Himachal Pradesh": ["Shimla", "Kullu", "Manali", "Dharamshala", "Solan", "Mandi", "Kangra", "Hamirpur", "Bilaspur", "Una", "Chamba", "Kinnaur"],
    "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Hazaribagh", "Deoghar", "Giridih", "Ramgarh", "Chaibasa"],
    "Karnataka": ["Bengaluru", "Mysuru", "Hubli", "Mangaluru", "Belagavi", "Kalaburagi", "Davangere", "Ballari", "Vijayapura", "Shivamogga", "Tumakuru", "Udupi"],
    "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Alappuzha", "Palakkad", "Malappuram", "Kannur", "Kottayam", "Idukki", "Wayanad"],
    "Madhya Pradesh": ["Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Rewa", "Dewas", "Satna", "Ratlam", "Chhindwara", "Vidisha"],
    "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Solapur", "Kolhapur", "Amravati", "Akola", "Jalgaon", "Sangli", "Latur", "Ahmednagar", "Satara", "Nanded"],
    "Manipur": ["Imphal", "Thoubal", "Bishnupur", "Churachandpur", "Ukhrul", "Senapati", "Tamenglong"],
    "Meghalaya": ["Shillong", "Tura", "Nongstoin", "Jowai", "Baghmara", "Williamnagar"],
    "Mizoram": ["Aizawl", "Lunglei", "Champhai", "Serchhip", "Kolasib", "Saiha", "Mamit"],
    "Nagaland": ["Kohima", "Dimapur", "Mokokchung", "Tuensang", "Wokha", "Zunheboto", "Mon"],
    "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri", "Balasore", "Baripada", "Angul", "Jharsuguda"],
    "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Hoshiarpur", "Firozpur", "Moga", "Sangrur", "Faridkot", "Muktsar"],
    "Rajasthan": ["Jaipur", "Jodhpur", "Kota", "Bikaner", "Ajmer", "Udaipur", "Alwar", "Sikar", "Bharatpur", "Pali", "Bhilwara", "Chittorgarh"],
    "Sikkim": ["Gangtok", "Namchi", "Gyalshing", "Mangan", "Rangpo"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Vellore", "Erode", "Thoothukudi", "Dindigul", "Thanjavur", "Kanchipuram"],
    "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam", "Mahbubnagar", "Nalgonda", "Adilabad", "Ramagundam"],
    "Tripura": ["Agartala", "Udaipur", "Dharmanagar", "Kailasahar", "Belonia", "Ambassa"],
    "Uttar Pradesh": ["Lucknow", "Kanpur", "Varanasi", "Agra", "Prayagraj", "Meerut", "Ghaziabad", "Noida", "Gorakhpur", "Bareilly", "Aligarh", "Moradabad", "Jhansi", "Mathura"],
    "Uttarakhand": ["Dehradun", "Haridwar", "Nainital", "Rishikesh", "Roorkee", "Haldwani", "Rudrapur", "Kashipur", "Almora", "Pithoragarh"],
    "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Malda", "Bardhaman", "Kharagpur", "Berhampore", "Jalpaiguri", "Darjeeling"],
    "Delhi": ["New Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi", "Central Delhi"],
    "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla", "Kupwara", "Pulwama", "Udhampur", "Kathua"],
    "Ladakh": ["Leh", "Kargil", "Nubra", "Zanskar"],
    "Chandigarh": ["Chandigarh"],
    "Puducherry": ["Puducherry", "Karaikal", "Yanam", "Mahe"],
    "Andaman and Nicobar Islands": ["Port Blair", "Diglipur", "Rangat", "Car Nicobar"],
    "Dadra and Nagar Haveli and Daman and Diu": ["Silvassa", "Daman", "Diu"],
    "Lakshadweep": ["Kavaratti", "Agatti", "Minicoy"],
}

# ~100 crops grown across India (cereals, pulses, oilseeds, cash crops, vegetables, fruits, spices, plantation)
ALL_INDIAN_CROPS = [
    # Cereals & millets
    "Rice", "Paddy", "Wheat", "Maize", "Sorghum (Jowar)", "Pearl Millet (Bajra)", "Finger Millet (Ragi)", "Barley", "Foxtail Millet", "Kodo Millet", "Little Millet", "Buckwheat",
    # Pulses
    "Chickpea (Chana)", "Pigeon Pea (Arhar/Tur)", "Green Gram (Moong)", "Black Gram (Urad)", "Lentil (Masoor)", "Field Pea", "Cowpea", "Horse Gram", "Moth Bean", "Kidney Bean (Rajma)",
    # Oilseeds
    "Groundnut", "Mustard", "Soybean", "Sunflower", "Sesame (Til)", "Safflower", "Castor", "Linseed", "Niger",
    # Commercial / cash
    "Cotton", "Sugarcane", "Jute", "Tobacco", "Rubber", "Tea", "Coffee",
    # Vegetables
    "Tomato", "Onion", "Potato", "Cabbage", "Cauliflower", "Brinjal (Eggplant)", "Okra (Bhindi)", "Chilli", "Capsicum", "Cucumber", "Bottle Gourd", "Bitter Gourd", "Pumpkin", "Ridge Gourd", "Ash Gourd", "Radish", "Carrot", "Beetroot", "Spinach", "Fenugreek (Methi)", "Coriander (Dhaniya)", "Mint", "Sweet Potato", "Yam", "Colocasia", "Peas", "French Bean", "Cluster Bean (Guar)", "Amaranth",
    # Fruits
    "Mango", "Banana", "Apple", "Grapes", "Guava", "Papaya", "Pomegranate", "Orange", "Sweet Lime (Mosambi)", "Lemon", "Lime", "Pineapple", "Watermelon", "Muskmelon", "Litchi", "Jackfruit", "Sapota (Chikoo)", "Custard Apple", "Ber", "Fig", "Strawberry", "Coconut", "Areca Nut",
    # Spices
    "Turmeric", "Ginger", "Garlic", "Cardamom", "Cumin (Jeera)", "Fennel (Saunf)", "Ajwain", "Black Pepper", "Cinnamon", "Clove", "Nutmeg", "Cashew",
    # Fodder/others
    "Berseem", "Lucerne", "Guinea Grass", "Napier Grass", "Fodder Sorghum",
]


def list_states() -> list[str]:
    return sorted(INDIA_STATES.keys())


def districts_for(state: str) -> list[str]:
    return INDIA_STATES.get(state, [])


def all_crops() -> list[str]:
    return sorted(ALL_INDIAN_CROPS)
