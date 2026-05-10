import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

interface Device {
  id: string;
  device_name: string;
  instance_name: string;
  state: string;
  qr_code: string;
  phone_number: string;
}

interface Conversation {
  id: string;
  name: string;
  jid: string;
  unread_count: number;
  last_message_at: string | null;
}

interface Message {
  id: string;
  content: string;
  from_me: boolean;
  timestamp: string;
  content_type: string;
}

const API_URL = 'http://localhost:3000';
const SOCKET_URL = 'http://localhost:3001';

export default function WhatsAppUI({ tenantId }: { tenantId: string }) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [socket, setSocket] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [isCreatingDevice, setIsCreatingDevice] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [showDeviceForm, setShowDeviceForm] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrPolling, setQrPolling] = useState<NodeJS.Timeout | null>(null);

  // Load devices
  useEffect(() => {
    loadDevices();
  }, [tenantId]);

  // Connect to socket
  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    newSocket.on('connect', () => {
      newSocket.emit('join:tenant', tenantId);
      setConnected(true);
    });
    newSocket.on('disconnect', () => setConnected(false));
    newSocket.on('device:created', () => loadDevices());
    newSocket.on('device:status', (data: { id: string; state: string }) => {
      setDevices(prev => prev.map(d => d.id === data.id ? { ...d, state: data.state } : d));
      setSelectedDevice(prev => prev ? { ...prev, state: data.state } : null);

      // If device connected, clear QR
      if (data.state === 'open') {
        setQrCode(null);
        if (qrPolling) {
          clearInterval(qrPolling);
          setQrPolling(null);
        }
      }
    });
    newSocket.on('message:new', (msg: Message) => {
      if (selectedConv === msg.conversation_id) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        });
      }
      // Update conversation list
      loadConversations(selectedDevice?.id);
    });
    setSocket(newSocket);
    return () => {
      newSocket.close();
      if (qrPolling) clearInterval(qrPolling);
    };
  }, [tenantId, selectedDevice?.id, selectedConv]);

  // Check device status periodically
  useEffect(() => {
    if (!selectedDevice || selectedDevice.state === 'open') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/api/whatsapp/devices/${selectedDevice.id}/status?tenant_id=${tenantId}`);
        const data = await res.json();
        setDevices(prev => prev.map(d => d.id === selectedDevice.id ? { ...d, state: data.state } : d));
        setSelectedDevice(prev => prev ? { ...prev, state: data.state } : null);

        if (data.state === 'open') {
          loadConversations(selectedDevice.id);
        }
      } catch (err) {
        console.error('Status check error:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedDevice?.id, selectedDevice?.state, tenantId]);

  const loadDevices = async () => {
    try {
      const res = await fetch(`${API_URL}/api/whatsapp/devices?tenant_id=${tenantId}`);
      const data = await res.json();
      setDevices(data);

      const openDevice = data.find((d: Device) => d.state === 'open');
      if (openDevice) {
        setSelectedDevice(openDevice);
        loadConversations(openDevice.id);
      }
    } catch (err) {
      console.error('Load devices error:', err);
    }
  };

  const getQRCode = async (deviceId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/whatsapp/devices/${deviceId}/qr?tenant_id=${tenantId}`);
      const data = await res.json();

      if (data.qr_code) {
        setQrCode(data.qr_code);
        startQRPolling(deviceId);
      } else if (data.state === 'pending') {
        // Try again in 2 seconds
        setTimeout(() => getQRCode(deviceId), 2000);
      }
    } catch (err) {
      console.error('Get QR code error:', err);
    }
  };

  const startQRPolling = (deviceId: string) => {
    // Clear existing polling
    if (qrPolling) clearInterval(qrPolling);

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/api/whatsapp/devices/${deviceId}/status?tenant_id=${tenantId}`);
        const data = await res.json();

        setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, state: data.state } : d));
        setSelectedDevice(prev => prev ? { ...prev, state: data.state } : null);

        // If connected, stop polling and clear QR
        if (data.state === 'open') {
          setQrCode(null);
          clearInterval(interval);
          setQrPolling(null);
          loadConversations(deviceId);
        }
      } catch (err) {
        console.error('Status polling error:', err);
      }
    }, 3000);

    setQrPolling(interval);
  };

  const loadConversations = async (deviceId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/whatsapp/conversations?tenant_id=${tenantId}&device_id=${deviceId}`);
      const data = await res.json();
      setConversations(data);

      // Add demo conversation if none exist
      if (data.length === 0) {
        setConversations([{
          id: 'demo-conversation',
          name: 'João Silva',
          jid: '5511999999999@s.whatsapp.net',
          unread_count: 0,
          last_message_at: null
        }]);
      }
    } catch (err) {
      console.error('Load conversations error:', err);
      // Add demo conversation on error
      setConversations([{
        id: 'demo-conversation',
        name: 'João Silva',
        jid: '5511999999999@s.whatsapp.net',
        unread_count: 0,
        last_message_at: null
      }]);
    }
  };

  const loadMessages = async (convId: string, loadMore = false) => {
    if (loadingMessages) return;

    setLoadingMessages(true);
    try {
      const offset = loadMore ? messages.length : 0;
      const res = await fetch(`${API_URL}/api/whatsapp/conversations/${convId}/messages?offset=${offset}&limit=50`);
      const data = await res.json();

      if (loadMore) {
        setMessages(prev => [...data.reverse(), ...prev]);
      } else {
        setMessages(data.reverse());
      }

      setHasMoreMessages(data.length === 50);
    } catch (err) {
      console.error('Load messages error:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const createDevice = async () => {
    if (!deviceName.trim()) return;
    setIsCreatingDevice(true);

    try {
      const res = await fetch(`${API_URL}/api/whatsapp/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId, device_name: deviceName })
      });
      const newDevice = await res.json();
      setDevices(prev => [...prev, newDevice]);
      setSelectedDevice(newDevice);
      setDeviceName('');
      setShowDeviceForm(false);

      // Start getting QR code for the new device
      getQRCode(newDevice.id);
    } catch (err) {
      console.error('Create device error:', err);
      alert('Erro ao criar dispositivo: ' + err.message);
    }
    setIsCreatingDevice(false);
  };



  const sendMessage = async () => {
    if (!messageText.trim() || isSending) return;

    // If no conversation selected, use demo
    const conversationId = selectedConv || 'demo-conversation';

    setIsSending(true);
    const textToSend = messageText.trim();

    // For demo conversation, simulate sending
    if (conversationId === 'demo-conversation') {
      const newMessage: Message = {
        id: `demo_${Date.now()}`,
        content: textToSend,
        from_me: true,
        timestamp: new Date().toISOString(),
        content_type: 'text'
      };

      setMessages(prev => [...prev, newMessage]);
      setMessageText('');

      // Simulate response after 1 second
      setTimeout(() => {
        const responseMessage: Message = {
          id: `demo_resp_${Date.now()}`,
          content: `Resposta automática: "${textToSend}"`,
          from_me: false,
          timestamp: new Date().toISOString(),
          content_type: 'text'
        };
        setMessages(prev => [...prev, responseMessage]);
      }, 1000);

      setIsSending(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId, conversation_id: conversationId, text: textToSend })
      });

      if (response.ok) {
        setMessageText('');
        // Message will be added via socket event
      } else {
        const error = await response.json();
        alert('Erro ao enviar mensagem: ' + (error.error || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error('Send message error:', err);
      alert('Erro de conexão ao enviar mensagem');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="whatsapp-container">
      <div className="wa-sidebar">
        <div className="wa-header">
          <h2>WhatsApp</h2>
          <span className={`wa-status ${connected ? 'connected' : ''}`}>
            {connected ? '🟢' : '🔴'}
          </span>
        </div>
        
        {/* Device management */}
        <div className="wa-devices-panel">
          {qrCode ? (
            <div className="wa-qr-section">
              <h3>📱 Conectar WhatsApp</h3>
              <p>Escaneie o QR code abaixo com seu WhatsApp:</p>
              <div className="wa-qr-container">
                <img
                  src={`https://api.qrserver.com/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCode)}`}
                  alt="QR Code WhatsApp"
                  className="wa-qr-image"
                />
              </div>
              <div className="wa-qr-instructions">
                <p><strong>Instruções:</strong></p>
                <ol>
                  <li>Abra o WhatsApp no seu celular</li>
                  <li>Toque no menu (⋮) → WhatsApp Web</li>
                  <li>Escaneie o código acima</li>
                  <li>Aguarde a conexão ser estabelecida</li>
                </ol>
              </div>
              <button
                onClick={() => {
                  setQrCode(null);
                  if (qrPolling) {
                    clearInterval(qrPolling);
                    setQrPolling(null);
                  }
                }}
                className="wa-cancel-qr"
              >
                ❌ Cancelar
              </button>
            </div>
          ) : (
            <>
              <div className="wa-devices-list">
                {devices.map(device => (
                  <div
                    key={device.id}
                    className={`wa-device-item ${selectedDevice?.id === device.id ? 'active' : ''} ${device.state}`}
                    onClick={() => {
                      setSelectedDevice(device);
                      loadConversations(device.id);
                      // Try to get QR if not connected
                      if (device.state !== 'open') {
                        getQRCode(device.id);
                      }
                    }}
                  >
                    <div className="wa-device-icon">
                      {device.state === 'open' ? '📱' : device.state === 'connecting' ? '⏳' : '❌'}
                    </div>
                    <div className="wa-device-info">
                      <div className="wa-device-name">{device.device_name}</div>
                      <div className="wa-device-status">
                        {device.state === 'open' ? 'Conectado' :
                         device.state === 'connecting' ? 'Conectando...' :
                         device.state === 'pending' ? 'Pendente' : 'Desconectado'}
                      </div>
                    </div>
                    {device.state !== 'open' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          getQRCode(device.id);
                        }}
                        className="wa-get-qr-btn"
                      >
                        📷 QR
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="wa-add-device">
                {!showDeviceForm ? (
                  <button onClick={() => setShowDeviceForm(true)} className="wa-add-btn">
                    ➕ Novo Dispositivo
                  </button>
                ) : (
                  <div className="wa-device-form">
                    <input
                      type="text"
                      placeholder="Nome do dispositivo"
                      value={deviceName}
                      onChange={e => setDeviceName(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && createDevice()}
                    />
                    <div className="wa-form-buttons">
                      <button onClick={createDevice} disabled={isCreatingDevice}>
                        {isCreatingDevice ? '⏳' : 'Criar'}
                      </button>
                      <button onClick={() => { setShowDeviceForm(false); setDeviceName(''); }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        
        {/* Conversations list */}
        <div className="wa-conversations">
          {conversations.map(conv => (
            <div
              key={conv.id}
              className={`wa-conv ${selectedConv === conv.id ? 'active' : ''}`}
              onClick={() => {
                setSelectedConv(conv.id);
                loadMessages(conv.id);
              }}
            >
              <div className="wa-conv-avatar">👤</div>
              <div className="wa-conv-info">
                <div className="wa-conv-name">{conv.name || conv.jid}</div>
                <div className="wa-conv-preview">
                  {conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString() : 'Sem mensagens'}
                </div>
              </div>
              {conv.unread_count > 0 && (
                <div className="wa-badge">{conv.unread_count}</div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <div className="wa-chat">
        {selectedConv ? (
          <>
            <div className="wa-chat-header">
              {conversations.find(c => c.id === selectedConv)?.name || 'Chat'}
            </div>
            <div className="wa-messages">
              {hasMoreMessages && messages.length > 0 && (
                <div className="wa-load-more">
                  <button
                    onClick={() => loadMessages(selectedConv!, true)}
                    disabled={loadingMessages}
                    className="wa-load-more-btn"
                  >
                    {loadingMessages ? '⏳ Carregando...' : '📜 Carregar mais mensagens'}
                  </button>
                </div>
              )}

              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`wa-message ${msg.from_me ? 'outgoing' : 'incoming'}`}
                >
                  <div className="wa-message-content">{msg.content}</div>
                  <div className="wa-message-time">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}

              {messages.length === 0 && !loadingMessages && (
                <div className="wa-no-messages">
                  {selectedConv === 'demo-conversation' ? (
                    <>
                      <div className="wa-message incoming">
                        <div className="wa-message-content">Olá! Esta é uma demonstração do WhatsApp Kero.</div>
                        <div className="wa-message-time">{new Date().toLocaleTimeString()}</div>
                      </div>
                      <div className="wa-message incoming">
                        <div className="wa-message-content">Envie uma mensagem para testar!</div>
                        <div className="wa-message-time">{new Date().toLocaleTimeString()}</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <p>Nenhuma mensagem ainda</p>
                      <small>Envie uma mensagem para começar a conversa!</small>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="wa-input">
              <input
                type="text"
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && !isSending && sendMessage()}
                placeholder="Digite uma mensagem..."
                disabled={isSending}
              />
              <button onClick={sendMessage} disabled={isSending || !messageText.trim()}>
                {isSending ? '⏳' : '➤'}
              </button>
            </div>
          </>
        ) : (
          <div className="wa-empty">
            <h2>💬 Bem-vindo ao WhatsApp Kero!</h2>
            <p>Selecione uma conversa à esquerda ou teste o chat demo:</p>
            <button
              onClick={() => {
                setSelectedConv('demo-conversation');
                setConversations([{
                  id: 'demo-conversation',
                  name: 'João Silva (Demo)',
                  jid: '5511999999999@s.whatsapp.net',
                  unread_count: 0,
                  last_message_at: null
                }]);
                setMessages([]);
              }}
              className="wa-demo-btn"
            >
              🎯 Iniciar Chat Demo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}