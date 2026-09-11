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

  type OldActor = {
    matches : List.List<Match>;
    state : { var nextMatchId : Nat };
  };

  type NewActor = {
    matches : List.List<Match>;
    state : { var nextMatchId : Nat };
  };

  public func migration(old : OldActor) : NewActor {
    // Recompute nextMatchId from the highest match ID + 1 to ensure
    // monotonic IDs after upgrade even if state was corrupted.
    var maxId = 0;
    for (m in old.matches.values()) {
      if (m.id > maxId) { maxId := m.id };
    };
    {
      matches = old.matches;
      state = { var nextMatchId = if (maxId == 0) { 1 } else { maxId + 1 } };
    };
  };
}
