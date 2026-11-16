import bomber from "@/assets/bomber-jacket.jpg";
import hoodie from "@/assets/core-hoodie.jpg";
import tracksuit from "@/assets/core-tracksuit.jpg";
import hoodieAlternate from "@/assets/hoodie-alternate.jpg";
import navyTracksuit from "@/assets/navy-tracksuit.jpg";
import shirt from "@/assets/oversized-shirt.jpg";
import stripedShirt from "@/assets/striped-shirt.jpg";
import trousers from "@/assets/tailored-trousers.jpg";
import jacket from "@/assets/technical-jacket.jpg";
import trackAlternate from "@/assets/tracksuit-alternate.jpg";
import utilityTrousers from "@/assets/utility-trousers.jpg";

export const IMAGE_BY_KEY: Record<string, string> = {
  "bomber-jacket": bomber,
  "core-hoodie": hoodie,
  "core-tracksuit": tracksuit,
  "navy-tracksuit": navyTracksuit,
  "oversized-shirt": shirt,
  "striped-shirt": stripedShirt,
  "tailored-trousers": trousers,
  "technical-jacket": jacket,
  "utility-trousers": utilityTrousers,
};

export const ALTERNATE_BY_KEY: Record<string, string> = {
  "core-hoodie": hoodieAlternate,
  "core-tracksuit": trackAlternate,
};
