import React from 'react';

function Home() {
  console.log('Home component rendering');
  return (
    <div style={{ padding: '20px', background: '#f0f0f0' }}>
      <h1>Welcome to CalcPro</h1>
      <p>If you can see this, React is working!</p>
    </div>
  );
}

export default Home; 