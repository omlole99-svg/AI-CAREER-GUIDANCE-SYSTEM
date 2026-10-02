async function testRoadmap() {
  try {
    const response = await fetch('http://localhost:5000/api/roadmap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill: 'React' })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error: ${response.status}`, errorText);
      return;
    }
    
    const data = await response.json();
    console.log("Returned data is array?", Array.isArray(data));
    console.log("Number of days:", data.length);
    console.log("Sample day 1:", data[0]);
    console.log("Sample day 30:", data[29]);
  } catch (err) {
    console.error("Test failed:", err);
  }
}
testRoadmap();
