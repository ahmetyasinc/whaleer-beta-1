import { getStrategies } from '@/api/strategies'; // getStrategies fonksiyonunun yolu
import useStrategyStore from '@/store/indicator/strategyStore'; // store'un yolu

export const load_strategies = async () => {
  try {
    const {
      tecnic,
      personal,
      public: community
    } = await getStrategies();

    const store = useStrategyStore.getState();

    store.setTecnicStrategies(tecnic);
    store.setPersonalStrategies(personal);
    store.setCommunityStrategies(community);

    // Aynı ID'ye sahip stratejilerden sadece birini al
    const allCombined = [...tecnic, ...personal, ...community];

    const uniqueById = Array.from(
      new Map(allCombined.map((item) => [item.id, item])).values()
    );

    useStrategyStore.setState({ all_strategies: uniqueById });

  } catch (error) {
    console.error("Stratejiler yüklenirken hata oluştu:", error);
  }
};