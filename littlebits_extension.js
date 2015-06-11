(function(ext) {

  var START_MSG = 0xF0,
    END_MSG = 0xF7;

  var parsingMsg = false;
  var msgBytesRead = 0;
  var storedMsg = new Uint8Array(1024);

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

  function processMsg() {
    inputVals.d0 = storedMsg[0] | (storedMsg[1] << 0x08);
    inputVals.a0 = storedMsg[2] | (storedMsg[3] << 0x08);
    inputVals.a1 = storedMsg[4] | (storedMsg[5] << 0x08);
  }

  function processInput(data) {
    for (var i=0; i < data.length; i++) {
      if (parsingMsg) {
        if (data[i] == END_MSG) {
          parsingMsg = false;
          processMsg();
        } else {
          storedMsg[msgBytesRead++] = data[i];
        }
      } else {
        if (data[i] == START_MSG) {
          parsingMsg = true;
          msgBytesRead = 0;
        }
      }
    }
  }

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
    if (val === 'on')
      output[2] = 1;
    else
      output[2] = 0;
    device.send(output.buffer);
  };

  ext.whenAnalogRead = function(pin, op, val) {
    if (op === '>')
      return inputVals[pin] > val;
    else if (op === '<')
      return inputVals[pin] < val;
    else if (op === '=')
      return inputVals[pin] === val;
    else
      return false;
  };

  ext.whenDigitalRead = function(pin, val) {
    if (val === 'on')
      return ext.digitalRead(pin);
    else
      return ext.digitalRead(pin) === false;
  };

  ext.mapValues = function(val, aMin, aMax, bMin, bMax) {
    var output = (((bMax - bMin) * (val - aMin)) / (aMax - aMin)) + bMin;
    return Math.round(output);
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
      var inputData = new Uint8Array(data);
      processInput(inputData);
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
    ext.digitalWrite(d1, 'off');
    ext.digitalWrite(d5, 'off');
    ext.digitalWrite(d9, 'off');
    if (device) device.close();
    if (poller) clearInterval(poller);
    device = null;
  };

  var descriptor = {
    blocks: [
      [' ', 'set %m.outDPins %m.dOutp', 'digitalWrite', 'd1', 'on'],
      [' ', 'set %m.outAPins to %n', 'analogWrite', 'd5', '255'],
      ['b', 'read %m.inDPins', 'digitalRead', 'd0'],
      ['r', 'read %m.inAPins', 'analogRead', 'a0'],
      ['h', 'when %m.inDPins is %m.dOutp', 'whenDigitalRead', 'd0', 'on'],
      ['h', 'when %m.inAPins is %m.ops %n', 'whenAnalogRead', 'a0', '>', '100'],
      ['r', 'map %n from %n %n to %n %n', 'mapValues', 500, 0, 1023, 0, 255]
    ],
    menus: {
      outDPins: ['d1', 'd5', 'd9'],
      outAPins: ['d5', 'd9'],
      inDPins: ['d0', 'a0', 'a1'],
      inAPins: ['a0', 'a1'],
      dOutp: ['on', 'off'],
      ops: ['>', '=', '<']
    },  
    url: 'http://khanning.github.io/scratch-littlebits-extension'
  };

  ScratchExtensions.register('littleBits', descriptor, ext, {type:'serial'});

})({});
