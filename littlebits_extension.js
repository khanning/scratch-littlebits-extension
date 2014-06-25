(function(ext) {

  var connected = false;
  var device = null;
  var poller = null;
  var rawData = null;
 
  /* TEMPORARY WORKAROUND
     this is needed since the _deviceRemoved method
     is not called when serial devices are unplugged*/
  var sendAttempts = 0;

  var pingCmd = new Uint8Array(1);
  pingCmd[0] = 1;

  var inputVals = { d0: 0, a0: 0, a1: 0 };
  var outputPins = { d1: 1, d5: 5, d9: 9 };

  function appendBuffer(buffer1, buffer2) {
    var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp.buffer;
  };

  function processData() {
    var input = new Uint8Array(rawData);
    inputVals.d0 = input[0];
    inputVals.a0 = input[1];
    inputVals.a1 = input[2];
    rawData = null;
  };

  ext.analogRead = function(pin) {
    return inputVals[pin];
  };

  ext.digitalRead = function(pin) {
    if (inputVals[pin] > 0) return true;
    return false;
  };
  
  ext.analogWrite = function(pin, val) {
    var output = new Uint8Array(3);
    output[0] = 2;
    output[1] = outputPins[pin];
    output[2] = val;
    device.send(output.buffer);
  };

  ext.digitalWrite = function(pin, val) {
    var output = new Uint8Array(3);
    output[0] = 3;
    output[1] = outputPins[pin];
    if (val == 'HIGH')
      output[2] = 1;
    else
      output[2] = 0;
    device.send(output.buffer);
  };

  ext.whenAnalogRead = function(pin, op, val) {
    if (op == '>')
      return inputVals[pin] > val;
    else if (op == '<')
      return inputVals[pin] < val;
    else if (op == '=')
      return inputVals[pin] == val;
    else
      return false;
  };

  ext.whenDigitalRead = function(pin, val) {
    if (val == 'HIGH')
      return ext.digitalRead(pin);
    else
      return ext.digitalRead(pin) == false;
  };
 
  ext._getStatus = function() {
    if (!connected)
      return { status:1, msg:'Disconnected' };
    else
      return { status:2, msg:'Connected' };
  };

  ext._deviceRemoved = function(dev) {
    // Not currently implemented with serial devices
  };

  var poller = null;
  ext._deviceConnected = function(dev) {
    sendAttempts = 0;
    connected = true;
    if (device) return;
    
    device = dev;
    device.open({ stopBits: 0, bitRate: 38400, ctsFlowControl: 0 });
    device.set_receive_handler(function(data) {

      sendAttempts = 0;

      if (!rawData || rawData.byteLength == 3)
        rawData = new Uint8Array(data);
      else
        rawData = appendBuffer(rawData, data);

      if (rawData.byteLength >= 3)
        processData();

    }); 

    poller = setInterval(function() {

      /* TEMPORARY WORKAROUND
         Since _deviceRemoved is not
         called while using serial devices */
      if (sendAttempts >= 10) {
        connected = false;
        device.close();
        device = null;
        rawData = null;
        clearInterval(poller);
        return;
      }
      
      device.send(pingCmd.buffer); 
      sendAttempts++;

    }, 50);

  };

  ext._shutdown = function() {
    ext.digitalWrite(d1, 'LOW');
    ext.digitalWrite(d5, 'LOW');
    ext.digitalWrite(d9, 'LOW');
    if (device) device.close();
    if (poller) clearInterval(poller);
    device = null;
  };

  var descriptor = {
    blocks: [
      [' ', 'digitalWrite %m.outDPins %m.dOutp', 'digitalWrite', 'd1', 'HIGH'],
      [' ', 'analogWrite %m.outAPins %n', 'analogWrite', 'd5', '255'],
      ['b', 'digitalRead %m.inDPins', 'digitalRead', 'd0'],
      ['r', 'analogRead %m.inAPins', 'analogRead', 'a0'],
      ['h', 'when %m.inDPins = %m.dOutp', 'whenDigitalRead', 'd0', 'HIGH'],
      ['h', 'when %m.inAPins %m.ops %n', 'whenAnalogRead', 'a0', '>', '100']
    ],
    menus: {
      outDPins: ['d1', 'd5', 'd9'],
      outAPins: ['d5', 'd9'],
      inDPins: ['d0', 'a0', 'a1'],
      inAPins: ['a0', 'a1'],
      dOutp: ['HIGH', 'LOW'],
      ops: ['>', '=', '<']
    },  
    url: 'http://github.com/khanning/scratch-littlebits-extension'
  };

  ScratchExtensions.register('littleBits', descriptor, ext, {type:'serial'});

})({});
