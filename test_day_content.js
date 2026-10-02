async function testDayContent() {
  try {
    const response = await fetch('http://localhost:5000/api/day-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skill: 'React',
        dayNumber: 1,
        dayTitle: 'Intro to React',
        topics: ['Components', 'JSX', 'State']
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error: ${response.status}`, errorText);
      return;
    }
    
    const data = await response.json();
    console.log("Day Content Generated successfully!");
    console.log("Keys present:", Object.keys(data));
    console.log("Snippet:", JSON.stringify(data, null, 2).slice(0, 300) + '...');
  } catch (err) {
    console.error("Test failed:", err);
  }
}
testDayContent();
