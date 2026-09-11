import Common "common";

module {
  public type SportName = Text;

  public type Sport = {
    id : Common.SportId;
    name : SportName;
  };

  public type Match = {
    id : Common.MatchId;
    sportId : Common.SportId;
    dalAId : Common.DalId;
    dalBId : Common.DalId;
    venue : Text;
    durationMinutes : Nat;
    var scoreA : Nat;
    var scoreB : Nat;
    var status : Common.MatchStatus;
    var isLive : Bool;
    var startTime : ?Common.Timestamp;
    var elapsedSeconds : Nat;
  };

  public type MatchPublic = {
    id : Common.MatchId;
    sportId : Common.SportId;
    sportName : Text;
    dalAId : Common.DalId;
    dalAName : Text;
    dalBId : Common.DalId;
    dalBName : Text;
    venue : Text;
    durationMinutes : Nat;
    scoreA : Nat;
    scoreB : Nat;
    status : Common.MatchStatus;
    isLive : Bool;
    startTime : ?Common.Timestamp;
    elapsedSeconds : Nat;
  };

  public type CreateMatchInput = {
    sportId : Common.SportId;
    dalAId : Common.DalId;
    dalBId : Common.DalId;
    venue : Text;
    durationMinutes : Nat;
    isLive : Bool;
  };
}
