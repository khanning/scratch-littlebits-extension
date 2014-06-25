/****************************************************/
/*                                                  */
/*    littleBits Scratch 2.0 extension              */
/*    created by Kreg Hanning 2014                  */
/*                                                  */
/****************************************************/

// Status codes sent from Scratch
const int READ_PINS = 1;
const int WRITE_ANALOG = 2;
const int WRITE_DIGITAL = 3;

// Analog input smoothing
// http://arduino.cc/en/Tutorial/Smoothing
const int NUM_READINGS = 10;
int index = 0;
int readingsA1[NUM_READINGS];
int readingsA0[NUM_READINGS];
int averageA1 = 0;
int averageA0 = 0;
int totalA1 = 0;
int totalA0 = 0;

// Reading from Serial
// http://arduino.cc/en/Serial/read
const int NUM_OUTPUT_PINS = 3;
int incomingByte = 0;
int inputPins[NUM_OUTPUT_PINS];
int outputPin;
int outputVal;

void setup() {
  
  // Set the Serial baud rate to 38400
  Serial.begin(38400);
  
  // Set up digital pins 1, 5, and 9 as outputs
  pinMode(1, OUTPUT);
  pinMode(5, OUTPUT);
  pinMode(9, OUTPUT);
  
  // Initialize the readings array with 0's
  for (int i = 0; i < NUM_READINGS; i++) {
    readingsA1[i] = 0;
    readingsA0[1] = 0;
  }

}

void loop() {
  
  // Check if there are bytes on the Serial port
  if (Serial.available() > 0) {
    
    // Get first available byte
    incomingByte = Serial.read();
    
    if (incomingByte == READ_PINS) {
    
      // Read digital pin 0
      inputPins[0] = digitalRead(0);
      
      // Get averages for analog pins 0 and 1
      inputPins[1] = averageA0;
      inputPins[2] = averageA1;
      
      // Send value 
      for (int i = 0; i < NUM_OUTPUT_PINS; i++)
        Serial.write(inputPins[i]);
    
    } else if (incomingByte == WRITE_ANALOG) {
    
      // Next byte from Scratch is pin number
      outputPin = Serial.read();
      
      // Next byte from Scratch is pin value
      outputVal = Serial.read();
      
      analogWrite(outputPin, outputVal);
    
    } else if (incomingByte == WRITE_DIGITAL) {
    
      // Next byte from Scratch is pin number
      outputPin = Serial.read();
      
      // Next byte from Scratch is pin value
      outputVal = Serial.read();
      
      digitalWrite(outputPin, outputVal);
    
    }
    
  }
  
  // Analog input smoothing
  // http://arduino.cc/en/Tutorial/Smoothing
  totalA0 = totalA0 - readingsA0[index];
  totalA1 = totalA1 - readingsA1[index];
  readingsA0[index] = analogRead(A0);
  readingsA1[index] = analogRead(A1);
  totalA0 = totalA0 + readingsA0[index];
  totalA1 = totalA1 + readingsA1[index];
  averageA0 = totalA0 / NUM_READINGS;
  averageA1 = totalA1 / NUM_READINGS;
  index = index + 1;
  if (index >= NUM_READINGS)
    index = 0;
  
  // Slight delay between loop
  delay(1);
}
