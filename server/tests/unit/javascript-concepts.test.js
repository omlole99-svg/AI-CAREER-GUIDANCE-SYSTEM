import { describe, it, expect } from 'vitest';

describe('JavaScript Concepts Demonstrations', () => {

  // 1. CLOSURES
  describe('JavaScript Closures', () => {
    it('demonstrates a genuine closure retaining outer variable access', () => {
      // Outer function receives a value
      function createClosureExample(secretMultiplier) {
        // Inner function accesses outer variable
        return function innerFunction(baseValue) {
          // Captures 'secretMultiplier' from outer scope
          return baseValue * secretMultiplier;
        };
      }

      const double = createClosureExample(2);
      const triple = createClosureExample(3);

      // The inner function correctly retains access to the outer variable
      expect(double(5)).toBe(10);
      expect(triple(5)).toBe(15);
    });
  });

  // 2. EVENT LOOP
  describe('JavaScript Event Loop', () => {
    it('demonstrates synchronous vs asynchronous execution order', async () => {
      const executionOrder = [];

      function eventLoopExample() {
        // 1. Synchronous code executes immediately
        executionOrder.push('sync-1');

        // 2. Schedule a macro-task timer
        setTimeout(() => {
          executionOrder.push('macro-task-timer');
        }, 0);

        // 3. Schedule a micro-task Promise
        Promise.resolve().then(() => {
          executionOrder.push('micro-task-promise');
        });

        // 4. Synchronous code finishes
        executionOrder.push('sync-2');
      }

      eventLoopExample();
      
      // At this exact moment, only synchronous code has run
      expect(executionOrder).toEqual(['sync-1', 'sync-2']);

      // Wait a tick to allow the event loop to flush micro and macro tasks
      await new Promise(resolve => setTimeout(resolve, 10));

      // Execution order verifies the Event Loop priority:
      // Sync -> Micro-tasks (Promise) -> Macro-tasks (setTimeout)
      expect(executionOrder).toEqual([
        'sync-1',
        'sync-2',
        'micro-task-promise',
        'macro-task-timer'
      ]);
    });
  });

  // 3. HOISTING
  describe('JavaScript Hoisting', () => {
    it('demonstrates function and variable hoisting rules safely', () => {
      let functionHoistingResult = '';

      // 1. Function declaration hoisting
      // We can safely call hoistingExample before it's defined
      functionHoistingResult = hoistingExample();

      function hoistingExample() {
        return 'I was hoisted!';
      }

      expect(functionHoistingResult).toBe('I was hoisted!');

      // 2. var vs let/const hoisting (safe demonstration)
      // `var` is hoisted and initialized with undefined.
      expect(typeof hoistedVar).toBe('undefined');
      var hoistedVar = 'I am var';
      expect(hoistedVar).toBe('I am var');

      // Note: If we tried to access a `let` variable here before its declaration, 
      // the engine would throw a strict ReferenceError (Temporal Dead Zone).
      // We avoid throwing it intentionally to keep the test suite green, but:
      let safeLet = 'I am safely declared';
      expect(safeLet).toBe('I am safely declared');
    });
  });

  // 4. PROMISES VS CALLBACKS
  describe('JavaScript Promises vs Callbacks', () => {
    it('compares callback-based and promise-based async operations', async () => {
      
      // Callback example
      function callbackExample(value, callback) {
        setTimeout(() => {
          callback(value * 2);
        }, 5);
      }

      // Promise example
      function promiseExample(value) {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(value * 2);
          }, 5);
        });
      }

      // Test Callback implementation
      const callbackResult = await new Promise((resolve) => {
        callbackExample(10, (result) => {
          resolve(result); // The callback receives the result
        });
      });
      expect(callbackResult).toBe(20);

      // Test Promise implementation natively
      const promiseResult = await promiseExample(10);
      expect(promiseResult).toBe(20);
    });
  });
});
