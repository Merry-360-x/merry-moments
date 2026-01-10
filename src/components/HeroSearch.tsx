import { Search, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const HeroSearch = () => {
  return (
    <div className="bg-background rounded-xl shadow-search p-2 flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full max-w-3xl mx-auto animate-fade-in">
      {/* Where */}
      <div className="flex-1 px-4 py-3 border-b md:border-b-0 md:border-r border-border">
        <label className="block text-xs text-muted-foreground mb-1">Where</label>
        <input
          type="text"
          placeholder="Search destinations"
          className="w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
        />
      </div>

      {/* When */}
      <div className="flex-1 px-4 py-3 border-b md:border-b-0 md:border-r border-border">
        <label className="block text-xs text-muted-foreground mb-1">When</label>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Add dates</span>
        </div>
      </div>

      {/* Who */}
      <div className="flex-1 px-4 py-3">
        <label className="block text-xs text-muted-foreground mb-1">Who</label>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-foreground">1 guest</span>
        </div>
      </div>

      {/* Search Button */}
      <Button variant="search" size="icon-lg" className="shrink-0 m-1">
        <Search className="w-5 h-5" />
      </Button>
    </div>
  );
};

export default HeroSearch;
