import List "mo:core/List";

module {
  type Match = {
    id : Nat;
    sportId : Nat;
    dalAId : Nat;
    dalBId : Nat;
    venue : Text;
    durationMinutes : Nat;
    var scoreA : Nat;
    var scoreB : Nat;
    var status : { #scheduled; #live; #completed };
    var isLive : Bool;
    var startTime : ?Int;
    var elapsedSeconds : Nat;
  };

  type OldActor = {};

  type NewActor = {
    matches : List.List<Match>;
    state : { var nextMatchId : Nat };
  };

  public func migration(_ : OldActor) : NewActor {
    {
      matches = List.empty<Match>();
      state = { var nextMatchId = 1 };
    };
  };
}
