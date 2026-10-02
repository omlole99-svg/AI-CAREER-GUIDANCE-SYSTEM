async function run() { 
  const p1 = await fetch('http://localhost:5000/api/resources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ skill: 'React' }) }); 
  console.log('React ->', (await p1.json())[0].title); 
  
  const p2 = await fetch('http://localhost:5000/api/resources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ skill: 'C++ & Node.js' }) }); 
  console.log('C++ & Node.js ->', (await p2.json())[0].title); 
  
  const p3 = await fetch('http://localhost:5000/api/resources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ skill: '<script>alert("xss")</script>React' }) }); 
  console.log('<script>... ->', (await p3.json())[0].title); 
  
  const p4 = await fetch('http://localhost:5000/api/resources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ skill: '<img src=x onerror=alert(1)>React' }) }); 
  console.log('<img... ->', (await p4.json())[0].title); 
} 
run();
