import { collection, query, where, getDocs } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';

export const useProductionData = () => {
  const db = getFirestore();

  const fetchProductionData = async (linha, selectedTurno = 'Todos') => {
    try {
      const productionRef = collection(db, 'producao_hora');
      let q;
      
      if (selectedTurno !== 'Todos') {
        q = query(
          productionRef,
          where('linha', '==', linha),
          where('turno', '==', selectedTurno)
        );
      } else {
        q = query(
          productionRef,
          where('linha', '==', linha)
        );
      }
      
      const querySnapshot = await getDocs(q);
      const registros = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        data: doc.data().data?.toDate?.() || doc.data().data
      }));
      
      return registros;
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      Alert.alert('Erro', 'Não foi possível atualizar os dados.');
      return [];
    }
  };

  return { fetchProductionData };
}; 