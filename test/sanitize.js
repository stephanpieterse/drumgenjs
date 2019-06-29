/* global require, describe, it */
/* jshint strict:false */
var sanitize = require("../sanitize.js");
var assert = require('assert');

describe("Sanitization tests", function() {

  it("Should have a function limiting string lengths", function(){
  
      var shortString = "12345";
      var longString = "";
      for (var i = 0; i <= 100; i++){
        longString = longString + i;
      }

      assert.equal(longString.length > 150, true, "String was too short!");

      assert.equal(shortString.length, sanitize.trimString(shortString).length, "Valid string should not have been shortened!");
      assert.notEqual(longString.length, sanitize.trimString(longString).length, "Valid string should not have been shortened!");

  });

  it("Should have a function to split only valid and max tuples", function(){
    var validTuples = "2,4,5";
    var invalidTuplesVal = "19,20000";
    var invalidTuplesString = "abcd,1";
    var invalidTuplesFormat = "2,3,4,";

    assert.deepEqual(sanitize.tuples(validTuples), [2,4,5], "Valid tuples broke!");
    var t1 = sanitize.tuples(invalidTuplesVal);
    for (var i in t1){
      assert.equal(t1[i] <= 17, true, "Tuple was greater than permitted!");
    }
  
    assert.deepEqual(sanitize.tuples(invalidTuplesString), [1,1], "String tuple failed!");
    assert.deepEqual(sanitize.tuples(invalidTuplesFormat), [2,3,4,1], "Formatted tuples failed!");
    
  });


});

