import List "mo:core/List";
import SportsTypes "types/sports";
import SportsApi "mixins/sports-api";
import DalsApi "mixins/dals-api";

actor {
  // Stable state — values come from migration chain
  let matches : List.List<SportsTypes.Match>;
  let state : { var nextMatchId : Nat };

  // Compose public API from mixins
  include SportsApi(matches, state);
  include DalsApi(matches);
}
