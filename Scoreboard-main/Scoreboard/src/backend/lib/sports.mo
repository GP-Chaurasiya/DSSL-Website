import Types "../types/sports";
import Common "../types/common";

module {
  /// Returns the list of all 17 DSSL sports.
  public func defaultSports() : [Types.Sport] {
    [
      { id = 1; name = "Basketball" },
      { id = 2; name = "Football" },
      { id = 3; name = "Cricket" },
      { id = 4; name = "Volleyball" },
      { id = 5; name = "Badminton" },
      { id = 6; name = "Table Tennis" },
      { id = 7; name = "Athletics (100m)" },
      { id = 8; name = "Athletics (400m)" },
      { id = 9; name = "Athletics (Relay Race)" },
      { id = 10; name = "Kho-Kho" },
      { id = 11; name = "Chess" },
      { id = 12; name = "Carrom" },
      { id = 13; name = "Tug of War" },
      { id = 14; name = "Long Jump" },
      { id = 15; name = "Javelin Throw" },
      { id = 16; name = "Discus Throw" },
      { id = 17; name = "Shot Put" },
    ];
  };

  /// Creates a new match record from the given input.
  public func createMatch(
    id : Common.MatchId,
    input : Types.CreateMatchInput,
  ) : Types.Match {
    {
      id;
      sportId = input.sportId;
      dalAId = input.dalAId;
      dalBId = input.dalBId;
      venue = input.venue;
      durationMinutes = input.durationMinutes;
      var scoreA = 0;
      var scoreB = 0;
      var status = #scheduled;
      var isLive = input.isLive;
      var startTime = null;
      var elapsedSeconds = 0;
    };
  };

  /// Increments score for team A (dalA) by 1.
  public func incrementScoreA(match : Types.Match) : () {
    match.scoreA += 1;
  };

  /// Decrements score for team A by 1, floor at 0.
  public func decrementScoreA(match : Types.Match) : () {
    if (match.scoreA > 0) { match.scoreA -= 1 };
  };

  /// Increments score for team B (dalB) by 1.
  public func incrementScoreB(match : Types.Match) : () {
    match.scoreB += 1;
  };

  /// Decrements score for team B by 1, floor at 0.
  public func decrementScoreB(match : Types.Match) : () {
    if (match.scoreB > 0) { match.scoreB -= 1 };
  };

  /// Starts a match (sets status to #live and records startTime).
  public func startMatch(match : Types.Match, now : Common.Timestamp) : () {
    match.status := #live;
    match.isLive := true;
    match.startTime := ?now;
  };

  /// Pauses/stops a live match without marking it completed.
  public func pauseMatch(match : Types.Match, now : Common.Timestamp) : () {
    let elapsed = switch (match.startTime) {
      case (?start) {
        let diffNs : Int = now - start;
        if (diffNs > 0) { match.elapsedSeconds + (diffNs / 1_000_000_000).toNat() } else { match.elapsedSeconds };
      };
      case null { match.elapsedSeconds };
    };
    match.elapsedSeconds := elapsed;
    match.startTime := null;
    match.isLive := false;
  };

  /// Marks a match as completed.
  public func completeMatch(match : Types.Match, now : Common.Timestamp) : () {
    let elapsed = switch (match.startTime) {
      case (?start) {
        let diffNs : Int = now - start;
        if (diffNs > 0) { match.elapsedSeconds + (diffNs / 1_000_000_000).toNat() } else { match.elapsedSeconds };
      };
      case null { match.elapsedSeconds };
    };
    match.elapsedSeconds := elapsed;
    match.status := #completed;
    match.isLive := false;
    match.startTime := null;
  };

  /// Resets a match back to scheduled state with zeroed scores.
  public func resetMatch(match : Types.Match) : () {
    match.scoreA := 0;
    match.scoreB := 0;
    match.status := #scheduled;
    match.isLive := false;
    match.startTime := null;
    match.elapsedSeconds := 0;
  };

  /// Converts internal Match to the shareable MatchPublic form.
  public func toPublic(
    match : Types.Match,
    sportName : Text,
    dalAName : Text,
    dalBName : Text,
  ) : Types.MatchPublic {
    {
      id = match.id;
      sportId = match.sportId;
      sportName;
      dalAId = match.dalAId;
      dalAName;
      dalBId = match.dalBId;
      dalBName;
      venue = match.venue;
      durationMinutes = match.durationMinutes;
      scoreA = match.scoreA;
      scoreB = match.scoreB;
      status = match.status;
      isLive = match.isLive;
      startTime = match.startTime;
      elapsedSeconds = match.elapsedSeconds;
    };
  };

  /// Validates a CreateMatchInput: sportId and both dalIds must exist in catalogs,
  /// venue must be non-empty, and the two dals must be different.
  public func validateInput(
    input : Types.CreateMatchInput,
    sports : [Types.Sport],
    dals : [{ id : Common.DalId; name : Text }],
  ) : Bool {
    if (input.venue.size() == 0) { return false };
    if (input.dalAId == input.dalBId) { return false };
    let sportValid = sports.find(func(s) { s.id == input.sportId }) != null;
    let dalAValid = dals.find(func(d) { d.id == input.dalAId }) != null;
    let dalBValid = dals.find(func(d) { d.id == input.dalBId }) != null;
    sportValid and dalAValid and dalBValid;
  };
}
