const body = JSON.stringify({ amount: 100, currency: 'INR', customer_id: '123', customer_email: 'test@test.com', customer_phone: '9999999999' });
fetch('http://127.0.0.1:3000/api/create-order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body
}).then(async r => {
  console.log('STATUS:', r.status);
  console.log('BODY:', await r.text());
}).catch(console.error);
