import React, { useState, useEffect } from 'react';
import { useEvolution } from '../hooks/useEvolution';

export function WhatsAppManager() {
  const { loading, error, createInstance, listInstances, sendMessage, getContacts } = useEvolution();
  const [instances, setInstances] = useState<any[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [messageText, setMessageText] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);

  useEffect(() => {
    loadInstances();
  }, []);

  const loadInstances = async () => {
    try {
      const data = await listInstances();
      setInstances(data.instances || []);
    } catch (err) {
      console.error('Failed to load instances:', err);
    }
  };

  const handleCreateInstance = async () => {
    const instanceName = prompt('Enter instance name:');
    if (instanceName) {
      try {
        await createInstance(instanceName);
        await loadInstances();
      } catch (err) {
        alert('Failed to create instance');
      }
    }
  };

  const handleLoadContacts = async () => {
    if (selectedInstance) {
      try {
        const data = await getContacts(selectedInstance);
        setContacts(data.contacts || []);
      } catch (err) {
        alert('Failed to load contacts');
      }
    }
  };

  const handleSendMessage = async () => {
    if (!selectedInstance || !phoneNumber || !messageText) {
      alert('Please fill all fields');
      return;
    }

    try {
      await sendMessage(selectedInstance, phoneNumber, messageText);
      setMessageText('');
      alert('Message sent successfully!');
    } catch (err) {
      alert('Failed to send message');
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">WhatsApp Manager</h2>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

      <div className="mb-6">
        <button
          onClick={handleCreateInstance}
          disabled={loading}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
        >
          {loading ? 'Creating...' : 'Create Instance'}
        </button>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Select Instance:</label>
        <select
          value={selectedInstance}
          onChange={(e) => setSelectedInstance(e.target.value)}
          className="w-full border rounded px-3 py-2"
        >
          <option value="">Choose an instance...</option>
          {instances.map((instance: any) => (
            <option key={instance.instanceName} value={instance.instanceName}>
              {instance.instanceName} ({instance.status})
            </option>
          ))}
        </select>
        <button
          onClick={handleLoadContacts}
          disabled={!selectedInstance || loading}
          className="mt-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          Load Contacts
        </button>
      </div>

      {contacts.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Or select from contacts:</label>
          <select
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">Choose a contact...</option>
            {contacts.map((contact: any) => (
              <option key={contact.id} value={contact.id}>
                {contact.name} ({contact.id})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Phone Number:</label>
        <input
          type="text"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="Enter phone number"
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Message:</label>
        <textarea
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Enter message"
          className="w-full border rounded px-3 py-2 h-24"
        />
      </div>

      <button
        onClick={handleSendMessage}
        disabled={loading || !selectedInstance || !phoneNumber || !messageText}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
      >
        {loading ? 'Sending...' : 'Send Message'}
      </button>
    </div>
  );
}
