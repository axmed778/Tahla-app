// Minimal list for country/city selectors. Extend as needed.
export const COUNTRY_CITIES: Record<string, string[]> = {
  "Azerbaijan": ["Baku", "Ganja", "Sumgait", "Mingachevir", "Lankaran", "Shirvan"],
  "Germany": ["Berlin", "Munich", "Hamburg", "Cologne", "Frankfurt", "Stuttgart"],
  "France": ["Paris", "Lyon", "Marseille", "Toulouse", "Nice", "Nantes"],
  "Italy": ["Rome", "Milan", "Naples", "Turin", "Florence", "Venice"],
  "Russia": ["Moscow", "Saint Petersburg", "Novosibirsk", "Yekaterinburg", "Kazan"],
  "Turkey": ["Istanbul", "Ankara", "Izmir", "Bursa", "Antalya", "Adana"],
  "United Kingdom": ["London", "Birmingham", "Manchester", "Leeds", "Glasgow", "Liverpool"],
  "United States": ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia"],
  "Canada": ["Toronto", "Vancouver", "Montreal", "Calgary", "Edmonton", "Ottawa"],
  "Spain": ["Madrid", "Barcelona", "Valencia", "Seville", "Zaragoza", "Malaga"],
  "Netherlands": ["Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven"],
  "Poland": ["Warsaw", "Krakow", "Lodz", "Wroclaw", "Poznan", "Gdansk"],
  "Ukraine": ["Kyiv", "Kharkiv", "Odesa", "Dnipro", "Lviv", "Donetsk"],
  "Georgia": ["Tbilisi", "Batumi", "Kutaisi", "Rustavi", "Zugdidi"],
  "Iran": ["Tehran", "Mashhad", "Isfahan", "Shiraz", "Tabriz", "Karaj"],
  "Kazakhstan": ["Almaty", "Nur-Sultan", "Shymkent", "Karaganda", "Aktobe"],
  "Uzbekistan": ["Tashkent", "Samarkand", "Bukhara", "Fergana", "Namangan"],
  "China": ["Beijing", "Shanghai", "Guangzhou", "Shenzhen", "Chengdu", "Hangzhou"],
  "Japan": ["Tokyo", "Osaka", "Yokohama", "Nagoya", "Sapporo", "Fukuoka"],
  "India": ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata"],
  "Brazil": ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador", "Fortaleza"],
  "Mexico": ["Mexico City", "Guadalajara", "Monterrey", "Puebla", "Tijuana"],
  "Australia": ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide"],
  "Egypt": ["Cairo", "Alexandria", "Giza", "Sharm El Sheikh", "Hurghada"],
  "South Africa": ["Johannesburg", "Cape Town", "Durban", "Pretoria", "Port Elizabeth"],
  "Nigeria": ["Lagos", "Abuja", "Kano", "Ibadan", "Port Harcourt"],
  "Saudi Arabia": ["Riyadh", "Jeddah", "Mecca", "Medina", "Dammam"],
  "United Arab Emirates": ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah"],
  "Indonesia": ["Jakarta", "Surabaya", "Bandung", "Medan", "Semarang"],
  "Pakistan": ["Karachi", "Lahore", "Islamabad", "Faisalabad", "Rawalpindi"],
  "Bangladesh": ["Dhaka", "Chittagong", "Khulna", "Rajshahi", "Sylhet"],
  "Other": [],
};

export const COUNTRIES = Object.keys(COUNTRY_CITIES).sort();

export function getCities(country: string): string[] {
  const cities = COUNTRY_CITIES[country];
  return cities ? [...cities].sort() : [];
}
