// Arquivo de teste para verificar sintaxe JSX
import React from 'react';

const TestComponent = () => {
  const qrCode = 'test';
  const showForm = false;

  return (
    <div>
      {qrCode ? (
        <div>
          <h3>QR Code</h3>
          <img src="test.jpg" alt="QR" />
        </div>
      ) : (
        <>
          <div>
            <h3>Form</h3>
            {showForm && <input type="text" />}
          </div>
        </>
      )}
    </div>
  );
};

export default TestComponent;