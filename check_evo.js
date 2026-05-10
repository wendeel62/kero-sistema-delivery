axios.defaults.baseURL = 'http://localhost:8085';

async function checkEvo() {
  // Try different endpoints
  const endpoints = [
    '/instance/connect/device_1777731494577',
    '/instance/device_1777731494577/connect', 
    '/instance/device_1777731494577',
    '/connect/device_1777731494577',
    '/',
    '/api/status'
  ];
  
  for (const ep of endpoints) {
    try {
      const res = await axios.get(ep);
      console.log(`${ep}: ${res.status}`, res.data?.substring(0, 200));
    } catch (e) {
      console.log(`${ep}: ${e.response?.status || e.message}`);
    }
  }
}

checkEvo();