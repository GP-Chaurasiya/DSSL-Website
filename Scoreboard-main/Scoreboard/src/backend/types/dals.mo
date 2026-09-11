import Common "common";

module {
  public type Dal = {
    id : Common.DalId;
    name : Text;
  };

  public type LeaderboardEntry = {
    dalId : Common.DalId;
    dalName : Text;
    wins : Nat;
    losses : Nat;
    draws : Nat;
    points : Nat;
    matchesPlayed : Nat;
    winPercentage : Float;
  };

  public type MedalTallyEntry = {
    dalId : Common.DalId;
    dalName : Text;
    gold : Nat;
    silver : Nat;
    bronze : Nat;
    total : Nat;
  };
}
