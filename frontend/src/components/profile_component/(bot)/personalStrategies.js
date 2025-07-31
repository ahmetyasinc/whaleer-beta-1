import useStrategyStore from "@/store/indicator/strategyStore";
import { IoMdStar, IoIosStarOutline } from "react-icons/io";

const PersonalStrategies = ({ onSelect }) => {
  const { favorites, strategies } = useStrategyStore();

  return (
    <div className="text-white pt-2 flex flex-col items-center w-full">
      <div className="w-full max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
        {strategies.length === 0 ? (
          <></>
        ) : (
          strategies.map((strategy) => (
            <div key={strategy.id} className="bg-gray-900 hover:bg-gray-800 flex items-center justify-between w-full h-[40px] mb-2">
              <div className="flex items-center pl-2">
                <div className="bg-transparent p-2 rounded-md hover:bg-gray-800">
                  {favorites.some((fav) => fav.id === strategy.id) ? (
                    <IoMdStar className="text-lg text-yellow-500" />
                  ) : (
                    <IoIosStarOutline className="text-lg text-gray-600" />
                  )}
                </div>
                <span className="text-[15px]">{strategy.name}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="bg-blue-600 px-2 rounded-md py-[1px] h-[26px] mr-3 hover:bg-blue-800 text-white text-xs"
                  onClick={() => onSelect(strategy)}
                >
                  Select
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PersonalStrategies;
