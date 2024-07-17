import React from 'react';
import { useCallback, useEffect, useState, useRef} from 'react';
import { createWorker } from 'tesseract.js';
import './App.css';
import axios from 'axios';

function App() {
  
  const [selectedImage, setSelectedImage] = useState(null);
  const [textResult, setTextResult] = useState('');
  const [tableData, setTableData] = useState([]);
  const [textType, setTextType] = useState('BoldText');
  const tableRef = useRef(null);
  const [error, setError] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setSelectedImage(file);
    setTextResult('');
    setTableData([]);
    setError(null);
  };

  const handleChangeTextType = (e) => {
    setTextType(e.target.value);
    setSelectedImage(null);
    setTextResult('');
    setTableData([]);
    setError(null);
  };

  const resetRadioState = () => {
    setTextType('BoldText');
    setSelectedImage(null);
    setTextResult('');
    setTableData([]);
    setError(null);
  };


  const drawTableLines = () => {
    if (!tableRef.current) return;

    const rows = tableRef.current.querySelectorAll('tr');
    const columnsCount = rows[0].children.length;

    // Drawing horizontal lines
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const hr = document.createElement('hr');
      hr.style.width = '100%';
      hr.style.borderTop = '1px solid black';
      row.appendChild(hr);
    }

    // Drawing vertical lines
    for (let i = 0; i < columnsCount; i++) {
      const tdCells = tableRef.current.querySelectorAll(`td:nth-child(${i + 1})`);
      tdCells.forEach((cell) => {
        const vr = document.createElement('div');
        vr.style.borderLeft = '1px solid black';
        vr.style.height = '100%';
        cell.appendChild(vr);
      });
    }
  };

  const convertImageToText = useCallback(async () => {
    if (!selectedImage) return;

    if (textType === 'BoldText') {
    
        const worker = await createWorker('eng');
        const { data: { text } } = await worker.recognize(selectedImage);
        setTextResult(text);
        console.log(text)

    } else if (textType === 'HandText') {
      
    const formData = new FormData();
    formData.append('file', selectedImage);

    try {
      const response = await axios.post('http://localhost:5000/predict', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setTextResult(response.data.prediction);
      console.log('Predicted Handwritten: '+ response.data.prediction);
    } catch (error) {
      console.error('Error predicting text:', error);
      setError('Failed to connect to the server. Please try again later.');
    }

  }else if (textType === 'TableExtraction'){

      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(selectedImage);
      
      console.log('Table contents: \n' + text)

      const cleanedText = text.replace(/\|/g, '');

      const extractedTable = cleanedText
            .split('\n')
            .map((line) => line.split(/\s+/).filter(Boolean))
            .filter((row) => row.length > 1);

      setTableData(extractedTable);
      console.log('Table data:', tableData);
      drawTableLines();

    }
}, [selectedImage, textType]);

  useEffect(() => {
    convertImageToText();
  }, [convertImageToText]);

  useEffect(() => {
    if (tableData.length > 0) {
      drawTableLines();
    }
  }, [tableData]);
    
    return (

        <div className = "Scribble">
          <h1>ScribbleOCR</h1>
          <p>Get text from image</p>

          {error && (
                <div className="error-popup">
                    <p>{error}</p>
                </div>
            )}

          <div className='input-wrapper'>
            <label htmlFor="upload">Upload Text</label>
            <input type="file" id="upload" accept='image/*' onChange={handleImageChange}></input>
          </div>
          
          <form className='radio-toolbar'>
            <p>Select text type</p>
            <input type="radio" value="BoldText" name="textscan" checked={textType ==='BoldText'} onChange={handleChangeTextType}/>
            <label>Print Text</label><br/>

            <br/><input type="radio" value="HandText" name="textscan" checked={textType ==='HandText'} onChange={handleChangeTextType}/>
            <label>Handwritten text</label><br/>

            <br/><input type="radio" value="TableExtraction" name="textscan" checked={textType ==='TableExtraction'} onChange={handleChangeTextType}/>
            <label>Extract Table</label><br/>
            <label>(Currently only for Print Text)</label><br/>

            <br/><button type="reset" onClick={resetRadioState}>Reset</button>
          </form>
          
          <div className='result'>
            {selectedImage && (
              <div className="box-image">
                <img src={URL.createObjectURL(selectedImage)} alt="thumb"/>
              </div>
            )}
            {
              textResult && (
                <div className="box-p">
                  <p>{textResult}</p>
                </div>
              )
            }
          {tableData.length > 0 && (
            <div className="table-container" ref={tableRef}>
              <h2>Extracted Table Data:</h2>
              <table>
                <tbody>
                  {tableData.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
}
export default App;