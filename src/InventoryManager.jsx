import React, { useState, useEffect, useMemo } from 'react';

// --- Local Storage Utility Functions ---

const STORAGE_KEYS = {
  INVENTORY: 'creditInventory',
  SALES: 'salesHistory',
};

const loadDataFromLocalStorage = (key) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`Error loading data from localStorage for key ${key}:`, error);
    return [];
  }
};

const saveDataToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving data to localStorage for key ${key}:`, error);
  }
};

// --- Utility function to trigger file download (Export) ---
const downloadFile = (data, filename, mimeType) => {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// --- Common Utility Functions ---

const calculateAmount = (quantity, rate) => (parseFloat(quantity) * parseFloat(rate)).toFixed(2);

// Utility function to format Date (Local storage saves dates as strings, not Firestore Timestamps)
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// --- Main Application Component ---
const App = () => {
  const [activeTab, setActiveTab] = useState('inventory');
  const [inventory, setInventory] = useState([]);
  const [sales, setSales] = useState([]);
  const [message, setMessage] = useState('');
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // 1. Load Data on Initial Mount (Simulates "Data Restore" on load)
  useEffect(() => {
    // Load Inventory
    const loadedInventory = loadDataFromLocalStorage(STORAGE_KEYS.INVENTORY);
    setInventory(loadedInventory);

    // Load Sales History (and sort by date descending)
    const loadedSales = loadDataFromLocalStorage(STORAGE_KEYS.SALES).sort((a, b) => 
      new Date(b.saleDate) - new Date(a.saleDate)
    );
    setSales(loadedSales);
    setIsDataLoaded(true);
  }, []);

  // 2. Save Data whenever Inventory or Sales change
  useEffect(() => {
    if (isDataLoaded) {
      saveDataToLocalStorage(STORAGE_KEYS.INVENTORY, inventory);
    }
  }, [inventory, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) {
      saveDataToLocalStorage(STORAGE_KEYS.SALES, sales);
    }
  }, [sales, isDataLoaded]);

  // --- Common UI Components ---

  const MessageBar = ({ message, type }) => {
    if (!message) return null;
    const baseClasses = "p-3 mb-4 rounded-lg text-center font-medium shadow-md";
    const colorClasses = type === 'error' ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700";
    return (
      <div className={`${baseClasses} ${colorClasses}`}>
        {message}
      </div>
    );
  };

  const TabButton = ({ id, label }) => (
    <button
      className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors duration-200 ${
        activeTab === id
          ? 'bg-blue-600 text-white shadow-lg'
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}
      onClick={() => setActiveTab(id)}
    >
      {label}
    </button>
  );

  // --- Data Management Component (New: For Backup and Restore) ---
  const DataManagement = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const dateString = new Date().toISOString().split('T')[0];

    // Function to handle data export (Download JSON backup)
    const handleExportData = () => {
        setIsProcessing(true);
        const backupData = {
            // Save current state of both datasets
            inventory: inventory, 
            sales: sales,
            version: 1.0,
            timestamp: new Date().toISOString()
        };

        const dataStr = JSON.stringify(backupData, null, 2);
        const filename = `inventory_backup_${dateString}.json`;
        
        downloadFile(dataStr, filename, 'application/json');
        setMessage(`Backup file '${filename}' downloaded successfully!`); // بیک اپ فائل کامیابی سے ڈاؤن لوڈ ہو گئی!
        setIsProcessing(false);
        setTimeout(() => setMessage(''), 3000);
    };

    // Function to handle data import (Upload and restore)
    const handleImportData = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsProcessing(true);
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const content = e.target.result;
                const loadedData = JSON.parse(content);

                // Basic validation to ensure the file structure is correct
                if (!Array.isArray(loadedData.inventory) || !Array.isArray(loadedData.sales)) {
                    throw new Error("Invalid backup file format. Missing 'inventory' or 'sales' arrays."); // بیک اپ فائل کا فارمیٹ غلط ہے۔
                }

                // 1. Update Inventory State
                setInventory(loadedData.inventory);

                // 2. Update Sales State (and re-sort by date descending)
                const loadedSales = loadedData.sales.sort((a, b) => 
                    new Date(b.saleDate) - new Date(a.saleDate)
                );
                setSales(loadedSales);

                setMessage(`Data successfully restored from '${file.name}'!`); // ڈیٹا کامیابی سے بحال ہو گیا!
                // Clear the input value
                event.target.value = null; 

            } catch (error) {
                console.error("Data Import Error:", error);
                setMessage(`Error: Failed to import data. ${error.message}`); // خرابی: ڈیٹا امپورٹ نہیں ہو سکا۔
            } finally {
                setIsProcessing(false);
                setTimeout(() => setMessage(''), 5000);
            }
        };

        reader.onerror = () => {
            setMessage('Error reading file.'); // فائل پڑھنے میں خرابی۔
            setIsProcessing(false);
            setTimeout(() => setMessage(''), 3000);
        };

        reader.readAsText(file);
    };

    return (
        <div className="bg-white p-4 rounded-xl shadow-lg border border-yellow-200 mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-3">Data Backup / Restore (Local Storage)</h3> {/* ڈیٹا بیک اپ / بحالی */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Export / Download Button */}
                <button
                    onClick={handleExportData}
                    disabled={isProcessing}
                    className="w-full bg-yellow-500 text-white font-bold py-3 px-4 rounded-xl hover:bg-yellow-600 transition duration-300 shadow-md flex items-center justify-center disabled:opacity-50"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    {isProcessing ? 'Preparing Download...' : '1. Download Backup (.json)'}
                </button>
                
                {/* Import / Upload Button */}
                <label className={`w-full flex items-center justify-center font-bold py-3 px-4 rounded-xl transition duration-300 shadow-md cursor-pointer ${isProcessing ? 'bg-gray-400 text-gray-700' : 'bg-blue-500 text-white hover:bg-blue-600'}`}>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                    {isProcessing ? 'Processing Upload...' : '2. Restore from Backup (.json)'}
                    <input 
                        type="file" 
                        accept=".json" 
                        onChange={handleImportData} 
                        disabled={isProcessing}
                        className="hidden" 
                    />
                </label>
            </div>
            <p className="text-xs text-gray-600 mt-3 text-center">
                **Warning:** Restoring from a backup will **overwrite** all current local data. (بحالی سے موجودہ ڈیٹا ختم ہو جائے گا)
            </p>
        </div>
    );
};

  // --- 3. Stock Entry Form Component ---

  const StockEntryForm = () => {
    const initialState = {
      id: '', code: '', group: '', name: '', quantity: 1, rate: 0,
    };
    const [newItem, setNewItem] = useState(initialState);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
      const { name, value } = e.target;
      let newValue = value;

      if (name === 'quantity' || name === 'rate') {
        newValue = value.replace(/[^0-9.]/g, '');
        if (newValue.startsWith('.')) newValue = '0' + newValue;
        if (newValue.match(/\./g)?.length > 1) return;
      }

      setNewItem(prev => ({ ...prev, [name]: newValue }));
    };
    
    // Calculate the next sequential Serial Number based on existing inventory
    const getNextSerialNo = useMemo(() => {
        let maxSerial = 0;
        inventory.forEach(item => {
            // Check if serialNo is a valid number, otherwise default to 0
            const existingSerial = parseInt(item.serialNo, 10);
            if (!isNaN(existingSerial) && existingSerial > maxSerial) {
                maxSerial = existingSerial;
            }
        });
        // Returns the next number as a string, starting from '1'
        return (maxSerial + 1).toString();
    }, [inventory]);

    const handleAddItem = (e) => {
      e.preventDefault();
      if (loading) return;

      // serialNo is now auto-calculated
      const { code, name, quantity, rate } = newItem; 
      const parsedQuantity = parseInt(quantity, 10);
      const parsedRate = parseFloat(rate);

      // Removed serialNo check from validation
      if (!code || !name || parsedQuantity <= 0 || parsedRate <= 0) {
        setMessage('Error: Please fill all required fields and ensure Quantity/Rate are positive.');
        setTimeout(() => setMessage(''), 3000);
        return;
      }

      setLoading(true);
      
      const newId = Date.now().toString(); // Simple unique ID
      const amount = calculateAmount(parsedQuantity, parsedRate);
      const nextSerialNo = getNextSerialNo; // Use the calculated next serial number

      const itemToAdd = {
        id: newId,
        serialNo: nextSerialNo, // Auto-generated Serial Number
        ...newItem,
        quantity: parsedQuantity,
        rate: parsedRate,
        amount: parseFloat(amount),
        dateAdded: new Date().toISOString(),
      };

      setInventory(prevInventory => [...prevInventory, itemToAdd]);
      
      setMessage(`Stock added successfully! Serial No: ${nextSerialNo}`); // Provide feedback
      setNewItem(initialState);
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    };

    const calculatedAmount = useMemo(() => {
      const { quantity, rate } = newItem;
      if (parseFloat(quantity) > 0 && parseFloat(rate) > 0) {
        return calculateAmount(quantity, rate);
      }
      return '0.00';
    }, [newItem.quantity, newItem.rate]);

    const inputClasses = "w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500";
    const labelClasses = "block text-sm font-medium text-gray-700 mb-1";

    return (
      <div className="bg-white p-6 rounded-xl shadow-2xl border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">Add New Credit Stock</h2>
        <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Display the auto-generated Serial Number */}
          <div>
            <label className={labelClasses}>Serial Number (Auto)</label>
            <div className="text-xl font-extrabold text-blue-600 p-2 border-2 border-blue-200 bg-blue-50 rounded-lg h-[44px] flex items-center">
              {getNextSerialNo}
            </div>
          </div>
          <div>
            <label className={labelClasses}>Code</label>
            <input type="text" name="code" value={newItem.code} onChange={handleChange} className={inputClasses} required />
          </div>
          <div>
            <label className={labelClasses}>Product Group</label>
            <input type="text" name="group" value={newItem.group} onChange={handleChange} className={inputClasses} placeholder="e.g., Charger, Case, Headset" />
          </div>
          <div>
            <label className={labelClasses}>Product Name</label>
            <input type="text" name="name" value={newItem.name} onChange={handleChange} className={inputClasses} required />
          </div>
          <div>
            <label className={labelClasses}>Quantity</label>
            <input type="number" name="quantity" min="1" step="1" value={newItem.quantity} onChange={handleChange} className={inputClasses} required />
          </div>
          <div>
            <label className={labelClasses}>Rate (Cost Price)</label>
            <input type="text" name="rate" value={newItem.rate} onChange={handleChange} className={inputClasses} placeholder="0.00" required />
          </div>
          <div className="col-span-1 md:col-span-3">
            <label className={labelClasses}>Amount (Total Cost)</label>
            <div className="text-2xl font-extrabold text-green-600 p-2 border-2 border-green-200 bg-green-50 rounded-lg">
              PKR {calculatedAmount}
            </div>
          </div>
          <div className="col-span-1 md:col-span-3 pt-4">
            <button
              type="submit"
              className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-blue-700 transition duration-300 shadow-lg disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add to Stock'}
            </button>
          </div>
        </form>
      </div>
    );
  };

  // --- 4. Inventory/Remaining Stock View ---

  const InventoryView = () => {
    const [saleQuantities, setSaleQuantities] = useState({});
    const [loadingSaleId, setLoadingSaleId] = useState(null);

    const handleSaleQuantityChange = (id, value) => {
      const qty = Math.max(0, parseInt(value, 10) || 0);
      setSaleQuantities(prev => ({ ...prev, [id]: qty }));
    };

    const handleRecordSale = (item) => {
      const quantityToSell = saleQuantities[item.id] || 0;
      if (quantityToSell <= 0 || quantityToSell > item.quantity) {
        setMessage('Error: Sale quantity is invalid or exceeds stock.');
        setTimeout(() => setMessage(''), 3000);
        return;
      }
      setLoadingSaleId(item.id);

      try {
        const newRemainingQuantity = item.quantity - quantityToSell;
        const amountSold = calculateAmount(quantityToSell, item.rate);
        const saleDate = new Date().toISOString();

        // 1. Update Inventory
        setInventory(prevInventory => {
          if (newRemainingQuantity > 0) {
            // Update existing item quantity
            return prevInventory.map(invItem => 
              invItem.id === item.id ? { ...invItem, quantity: newRemainingQuantity } : invItem
            );
          } else {
            // Remove item from inventory if quantity is zero
            return prevInventory.filter(invItem => invItem.id !== item.id);
          }
        });

        // 2. Add to Sales History
        const newSale = {
          id: Date.now().toString(),
          inventoryId: item.id,
          serialNo: item.serialNo,
          code: item.code,
          group: item.group,
          name: item.name,
          rate: item.rate,
          quantitySold: quantityToSell,
          amountSold: parseFloat(amountSold),
          saleDate: saleDate,
        };
        
        setSales(prevSales => [newSale, ...prevSales].sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate)));

        setMessage(`${quantityToSell}x ${item.name} sold and recorded! Remaining stock: ${newRemainingQuantity}.`);
        setSaleQuantities(prev => { delete prev[item.id]; return { ...prev }; });
      } catch (error) {
        console.error("Error recording sale: ", error);
        setMessage('Error: Failed to record sale.');
      } finally {
        setLoadingSaleId(null);
        setTimeout(() => setMessage(''), 3000);
      }
    };

    // Prepare data for supplier printout
    const InventoryPrintContent = () => (
      <div id="inventory-print-area" className="p-4">
        <h3 className="text-xl font-bold mb-3">Remaining Stock List (Supplier Report)</h3>
        <p className="mb-4 text-sm">Date: {formatDate(new Date().toISOString())}</p>
        <table className="min-w-full border-collapse border border-gray-400">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 p-2 text-left text-sm">S.No</th>
              <th className="border border-gray-400 p-2 text-left text-sm">Code</th>
              <th className="border border-gray-400 p-2 text-left text-sm">Product Name</th>
              <th className="border border-gray-400 p-2 text-right text-sm">Quantity</th>
              <th className="border border-gray-400 p-2 text-right text-sm">Rate (Cost)</th>
              <th className="border border-gray-400 p-2 text-right text-sm">Amount (Total)</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((item) => (
              <tr key={item.id} className="even:bg-white odd:bg-gray-50">
                <td className="border border-gray-400 p-2 text-sm">{item.serialNo}</td>
                <td className="border border-gray-400 p-2 text-sm">{item.code}</td>
                <td className="border border-gray-400 p-2 text-sm">{item.name}</td>
                <td className="border border-gray-400 p-2 text-right text-sm">{item.quantity}</td>
                <td className="border border-gray-400 p-2 text-right text-sm">{item.rate.toFixed(2)}</td>
                <td className="border border-gray-400 p-2 text-right text-sm">{calculateAmount(item.quantity, item.rate)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-200 font-bold">
                <td colSpan="3" className="border border-gray-400 p-2 text-left text-sm">Total Unique Items: {inventory.length}</td>
                <td colSpan="3" className="border border-gray-400 p-2 text-right text-sm">Total Inventory Cost: PKR {inventory.reduce((sum, item) => sum + parseFloat(calculateAmount(item.quantity, item.rate)), 0).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    );

    const handlePrintInventory = () => {
      const printContent = document.getElementById('inventory-print-area').innerHTML;
      const originalContent = document.body.innerHTML;
      document.body.innerHTML = printContent;
      window.print();
      document.body.innerHTML = originalContent; 
      window.location.reload(); 
    };

    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-gray-800">Remaining Stock (Inventory)</h2>
        <div className="flex justify-between items-center bg-yellow-50 p-4 rounded-xl shadow-inner">
            <p className="text-gray-700 font-medium">
                Total Unique Items: <span className="text-xl font-bold text-blue-600">{inventory.length}</span>
            </p>
            <button
                onClick={handlePrintInventory}
                disabled={inventory.length === 0}
                className="bg-green-500 text-white font-semibold py-2 px-4 rounded-xl hover:bg-green-600 transition duration-300 shadow-md flex items-center disabled:opacity-50"
            >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h4m-4 0v-4m4 0v-4"></path></svg>
                Print Remaining Stock Report
            </button>
        </div>

        {/* Hidden area for print utility */}
        <div style={{ display: 'none' }}>
          <InventoryPrintContent />
        </div>

        <div className="overflow-x-auto bg-white rounded-xl shadow-2xl border border-gray-100">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['S.No', 'Code', 'Name', 'Quantity', 'Rate', 'Amount', 'Sale Qty', 'Action'].map(header => (
                  <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventory.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                    No credit stock currently available. Please add items first.
                  </td>
                </tr>
              ) : (
                inventory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.serialNo}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">{item.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">PKR {item.rate.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">PKR {calculateAmount(item.quantity, item.rate)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <input
                        type="number"
                        min="0"
                        max={item.quantity}
                        value={saleQuantities[item.id] || ''}
                        onChange={(e) => handleSaleQuantityChange(item.id, e.target.value)}
                        placeholder="Qty"
                        className="w-20 p-1 border border-gray-300 rounded-md text-center"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleRecordSale(item)}
                        disabled={loadingSaleId === item.id || !saleQuantities[item.id] || saleQuantities[item.id] <= 0}
                        className="bg-red-500 text-white py-1 px-3 rounded-full hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-150"
                      >
                        {loadingSaleId === item.id ? 'Recording...' : 'Record Sale'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // --- 5. Sales History View ---

  const SalesView = () => {
    const today = new Date().toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteType, setDeleteType] = useState(null);

    // Filter sales based on date range
    const filteredSales = useMemo(() => {
        if (!startDate || !endDate) return sales;
        
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0); // Start of day

        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // End of day

        return sales.filter(sale => {
            const saleDateTime = new Date(sale.saleDate); 
            return saleDateTime >= start && saleDateTime <= end;
        });
    }, [sales, startDate, endDate]);

    const totalSaleAmount = useMemo(() => {
        return filteredSales.reduce((sum, sale) => sum + (sale.amountSold || 0), 0).toFixed(2);
    }, [filteredSales]);

    // Deletion Modal and Logic
    const handleDeleteRecords = () => {
        setShowDeleteModal(false);
        if (!deleteType) return;
        
        if (deleteType === 'sales') {
            setSales([]);
            setMessage(`Successfully deleted all Sales History records from local storage.`);
        } else if (deleteType === 'inventory') {
            setInventory([]);
            setMessage(`Successfully deleted all Remaining Stock (Inventory) records from local storage.`);
        }
        setTimeout(() => setMessage(''), 3000);
    };

    const DeleteConfirmationModal = () => (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-96">
                <h3 className="text-xl font-bold text-red-600 mb-4">Confirm Deletion</h3>
                <p className="mb-6">Are you sure you want to permanently delete **ALL** {deleteType === 'inventory' ? 'Remaining Stock (Inventory)' : 'Sales History'} records? This action cannot be undone.</p>
                <div className="flex justify-end space-x-3">
                    <button 
                        onClick={() => setShowDeleteModal(false)}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleDeleteRecords}
                        className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
                    >
                        Delete Permanently
                    </button>
                </div>
            </div>
        </div>
    );

    // Printing Logic (Sales)
    const SalesPrintContent = () => (
      <div id="sales-print-area" className="p-4">
        <h3 className="text-xl font-bold mb-3">Sold Items List (Supplier Report)</h3>
        <p className="mb-4 text-sm">
            Date Range: {formatDate(startDate)} to {formatDate(endDate)}
        </p>
        <table className="min-w-full border-collapse border border-gray-400">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 p-2 text-left text-sm">Date</th>
              <th className="border border-gray-400 p-2 text-left text-sm">S.No</th>
              <th className="border border-gray-400 p-2 text-left text-sm">Product Name</th>
              <th className="border border-gray-400 p-2 text-right text-sm">Qty Sold</th>
              <th className="border border-gray-400 p-2 text-right text-sm">Rate (Cost)</th>
              <th className="border border-gray-400 p-2 text-right text-sm">Cost Amount</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.map((item) => (
              <tr key={item.id} className="even:bg-white odd:bg-gray-50">
                <td className="border border-gray-400 p-2 text-sm">{formatDate(item.saleDate)}</td>
                <td className="border border-gray-400 p-2 text-sm">{item.serialNo}</td>
                <td className="border border-gray-400 p-2 text-sm">{item.name}</td>
                <td className="border border-gray-400 p-2 text-right text-sm">{item.quantitySold}</td>
                <td className="border border-gray-400 p-2 text-right text-sm">{item.rate.toFixed(2)}</td>
                <td className="border border-gray-400 p-2 text-right text-sm">{item.amountSold.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-200 font-bold">
                <td colSpan="3" className="border border-gray-400 p-2 text-left text-sm">Total Sales Items: {filteredSales.length}</td>
                <td colSpan="3" className="border border-gray-400 p-2 text-right text-sm">Total Cost of Goods Sold: PKR {totalSaleAmount}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    );

    const handlePrintSales = () => {
      const printContent = document.getElementById('sales-print-area').innerHTML;
      const originalContent = document.body.innerHTML;
      document.body.innerHTML = printContent;
      window.print();
      document.body.innerHTML = originalContent; 
      window.location.reload(); 
    };

    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-gray-800">Sales History & Reports</h2>
        
        {showDeleteModal && <DeleteConfirmationModal />}

        <div className="bg-blue-50 p-4 rounded-xl shadow-inner grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" />
            </div>
            <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700">End Date</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" />
            </div>
            <div className="col-span-1">
                <button
                    onClick={handlePrintSales}
                    disabled={filteredSales.length === 0}
                    className="w-full bg-green-500 text-white font-semibold py-2 px-4 rounded-xl hover:bg-green-600 transition duration-300 shadow-md flex items-center justify-center disabled:opacity-50"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h4m-4 0v-4m4 0v-4"></path></svg>
                    Print Filtered Sales
                </button>
            </div>
            <div className="col-span-1">
                <button
                    onClick={() => { setDeleteType('sales'); setShowDeleteModal(true); }}
                    disabled={sales.length === 0}
                    className="w-full bg-gray-500 text-white font-semibold py-2 px-4 rounded-xl hover:bg-gray-600 transition duration-300 shadow-md flex items-center justify-center disabled:opacity-50"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    Delete Sales History
                </button>
            </div>
        </div>

        {/* Hidden area for print utility */}
        <div style={{ display: 'none' }}>
          <SalesPrintContent />
        </div>

        <div className="overflow-x-auto bg-white rounded-xl shadow-2xl border border-gray-100">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Sale Date', 'S.No', 'Code', 'Product Name', 'Group', 'Quantity Sold', 'Rate (Cost)', 'Amount Sold (Cost)'].map(header => (
                  <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                    No sales recorded in the selected date range.
                  </td>
                </tr>
              ) : (
                filteredSales.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatDate(item.saleDate)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.serialNo}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.group}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-bold">{item.quantitySold}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">PKR {item.rate.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">PKR {item.amountSold.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
                <tr className="bg-gray-100">
                    <td colSpan="7" className="px-6 py-3 text-right text-lg font-bold text-gray-700">Total Cost of Goods Sold (Filtered):</td>
                    <td className="px-6 py-3 whitespace-nowrap text-lg font-extrabold text-red-600">PKR {totalSaleAmount}</td>
                </tr>
            </tfoot>
          </table>
        </div>
        
        {/* Bulk Delete for Inventory */}
        <div className="pt-8 text-center border-t border-gray-200">
            <button
                onClick={() => { setDeleteType('inventory'); setShowDeleteModal(true); }}
                disabled={inventory.length === 0}
                className="bg-red-500 text-white font-semibold py-2 px-4 rounded-xl hover:bg-red-600 transition duration-300 shadow-lg flex items-center justify-center mx-auto disabled:opacity-50"
            >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                Delete ALL Remaining Stock (Inventory)
            </button>
            <p className="text-xs text-gray-500 mt-2">Use this option when returning all remaining stock to the supplier.</p>
        </div>
      </div>
    );
  };

  // --- Main Render ---

  if (!isDataLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">Loading local data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 font-sans">
      <script src="https://cdn.tailwindcss.com"></script>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
        body { font-family: 'Inter', sans-serif; }
        .print-only { display: none; }
        @media print {
            body > div:not(#inventory-print-area):not(#sales-print-area) { display: none; }
            .print-only { display: block; }
            table, th, td { border: 1px solid #4a5568 !important; }
            .min-w-full { width: 100% !important; }
        }
      `}</style>

      <header className="mb-4">
        <h1 className="text-4xl font-extrabold text-blue-800 mb-2">Mobile Accessories Credit Stock Manager</h1>
        <p className="text-gray-600">Data is stored locally in your browser.</p>
      </header>
      
      {/* New Data Management Component */}
      <DataManagement />

      <MessageBar message={message} type={message.startsWith('Error') ? 'error' : 'success'} />

      <div className="mb-6">
        <TabButton id="add" label="Add New Stock" />
        <TabButton id="inventory" label="Remaining Stock" />
        <TabButton id="sales" label="Sales History & Reports" />
      </div>

      <div className="bg-white p-6 rounded-b-xl rounded-r-xl shadow-2xl min-h-[600px] border-t-4 border-blue-600">
        {activeTab === 'add' && <StockEntryForm />}
        {activeTab === 'inventory' && <InventoryView />}
        {activeTab === 'sales' && <SalesView />}
      </div>
    </div>
  );
};

export default App;
