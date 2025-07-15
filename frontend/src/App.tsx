import React from 'react';
import FileUploadComponent from './components/FileUploadComponent';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>File Upload System</h1>
      </header>
      <main>
        <FileUploadComponent />
      </main>
    </div>
  );
}

export default App;