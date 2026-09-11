
module {
  public type MatchId = Nat;
  public type DalId = Nat;
  public type SportId = Nat;
  public type Timestamp = Int;

  public type MatchStatus = {
    #scheduled;
    #live;
    #completed;
  };
}
