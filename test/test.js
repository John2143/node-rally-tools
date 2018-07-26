let rallyTools = require("../bundle.js");

const chai = require("chai");

chai.should();
global.expect = chai.expect;

describe("exports", function(){
    it("should have exports", function(){
        rallyTools.should.contain.key("Rule");
    });
});
