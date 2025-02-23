import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, RefreshControl, Dimensions, ScrollView, Modal, Pressable, Alert, TextInput } from 'react-native';
import { getFirestore, collection, query, orderBy, onSnapshot, where, deleteDoc, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { globalStyles, colors } from '../styles/globalStyles';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

const LINHAS = ['A', 'B', 'C', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'VR'];
const TURNOS = ['A', 'B', 'C', 'X', 'Y', 'Todos'];

export default function ProductionDataScreen({ navigation }) {
  const [productionData, setProductionData] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTurno, setSelectedTurno] = useState('Todos');
  const [turnoModalVisible, setTurnoModalVisible] = useState(false);
  const [userName, setUserName] = useState('');
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [password, setPassword] = useState('');
  const db = getFirestore();
  const auth = getAuth();

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const handleDataCleanup = () => {
    setPasswordModalVisible(true);
  };

  const handlePasswordSubmit = () => {
    if (password === 'master') {
      setPasswordModalVisible(false);
      setPassword('');
      Alert.alert(
        'Confirmação Final',
        'Isso irá remover TODOS os dados do sistema. Esta ação não pode ser desfeita.',
        [
          {
            text: 'Cancelar',
            style: 'cancel'
          },
          {
            text: 'Confirmar',
            style: 'destructive',
            onPress: async () => {
              try {
                const querySnapshot = await getDocs(collection(db, 'producao_hora'));
                let deletedCount = 0;

                for (const doc of querySnapshot.docs) {
                  await deleteDoc(doc.ref);
                  deletedCount++;
                }

                Alert.alert(
                  'Sucesso',
                  `${deletedCount} registros foram removidos.`
                );
              } catch (error) {
                console.error('Erro ao limpar dados:', error);
                Alert.alert('Erro', 'Não foi possível limpar os dados.');
              }
            }
          }
        ]
      );
    } else {
      Alert.alert('Erro', 'Senha incorreta!');
      setPassword('');
    }
  };

  useEffect(() => {
    const productionRef = collection(db, 'producao_hora');
    
    let q;
    if (selectedTurno !== 'Todos') {
      q = query(productionRef, where('turno', '==', selectedTurno));
    } else {
      q = query(productionRef, orderBy('data', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      try {
        const groupedData = LINHAS.reduce((acc, linha) => {
          acc[linha] = {
            linha,
            totalMeta: 0,
            totalProducao: 0,
            registros: [],
            ultimaAtualizacao: null
          };
          return acc;
        }, {});

        // Processar documentos
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (groupedData[data.linha]) {
            const dataObj = {
              id: doc.id,
              ...data,
              data: data.data?.toDate?.() || data.data
            };

            groupedData[data.linha].totalMeta += Number(data.meta) || 0;
            groupedData[data.linha].totalProducao += Number(data.realProduzido) || 0;
            groupedData[data.linha].registros.push(dataObj);

            if (!groupedData[data.linha].ultimaAtualizacao || 
                dataObj.data > groupedData[data.linha].ultimaAtualizacao) {
              groupedData[data.linha].ultimaAtualizacao = dataObj.data;
            }
          }
        });

        // Ordenar os registros considerando o horário especial
        Object.values(groupedData).forEach(linha => {
          linha.registros.sort((a, b) => {
            const getAdjustedTime = (date) => {
              // Verificar se a data é válida
              if (!date || !(date instanceof Date)) {
                console.warn('Data inválida:', date);
                return 0; // Retorna 0 para datas inválidas
              }

              const hours = date.getHours();
              const minutes = date.getMinutes();
              const totalMinutes = hours * 60 + minutes;
              
              // Se o horário estiver entre 00:00 e 01:23, adiciona 24 horas
              return totalMinutes <= 83 ? totalMinutes + (24 * 60) : totalMinutes;
            };

            // Garantir que as datas são objetos Date válidos
            const dateA = a.data instanceof Date ? a.data : new Date(a.data);
            const dateB = b.data instanceof Date ? b.data : new Date(b.data);

            const timeA = getAdjustedTime(dateA);
            const timeB = getAdjustedTime(dateB);
            
            return timeB - timeA;
          });
        });

        // Ordenar as linhas por última atualização
        const sortedData = Object.values(groupedData).sort((a, b) => {
          if (!a.ultimaAtualizacao) return 1;
          if (!b.ultimaAtualizacao) return -1;
          return b.ultimaAtualizacao - a.ultimaAtualizacao;
        });

        setProductionData(sortedData);
      } catch (error) {
        console.error('Erro ao processar dados:', error);
      }
    });

    return () => unsubscribe();
  }, [selectedTurno]);

  useEffect(() => {
    // Pegar o email do usuário e formatá-lo
    const email = auth.currentUser?.email;
    if (email) {
      const name = email.split('@')[0];
      // Capitalizar primeira letra
      setUserName(name.charAt(0).toUpperCase() + name.slice(1));
    }
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    // Aguardar um momento para dar feedback visual
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.card, item.registros.length === 0 && styles.emptyCard]}
      onPress={() => {
        if (item.registros.length > 0) {
          navigation.navigate('ProductionDetail', { 
            linha: item.linha,
            registros: item.registros 
          });
        }
      }}
    >
      <Text style={styles.linhaTitle}>Linha {item.linha}</Text>
      <View style={styles.dataRow}>
        <View style={styles.dataColumn}>
          <FontAwesome5 name="bullseye" size={20} color={colors.primary} style={styles.icon} />
          <Text style={styles.label}>Meta Total</Text>
          <Text style={styles.value}>{item.totalMeta}</Text>
        </View>
        <View style={styles.dataColumn}>
          <FontAwesome5 name="industry" size={20} color={colors.primary} style={styles.icon} />
          <Text style={styles.label}>Produção Total</Text>
          <Text style={styles.value}>{item.totalProducao}</Text>
        </View>
      </View>
      {item.registros.length === 0 && (
        <View style={styles.emptyOverlay}>
          <Text style={styles.emptyText}>Sem dados</Text>
        </View>
      )}
      {item.registros.length > 0 && (
        <View style={[styles.statusBar, { 
          backgroundColor: item.totalProducao >= item.totalMeta ? colors.success : colors.warning
        }]} />
      )}
    </TouchableOpacity>
  );

  // Componente para seleção de turno
  const TurnoSelector = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.turnoScrollView}
    >
      <View style={styles.turnoContainer}>
        {TURNOS.map((turno) => (
          <TouchableOpacity
            key={turno}
            style={[
              styles.turnoButton,
              selectedTurno === turno && styles.turnoButtonSelected
            ]}
            onPress={() => setSelectedTurno(turno)}
          >
            <MaterialIcons 
              name={turno === 'Todos' ? 'view-carousel' : 'access-time'} 
              size={20} 
              color={selectedTurno === turno ? colors.white : colors.primary}
            />
            <Text style={[
              styles.turnoText,
              selectedTurno === turno && styles.turnoTextSelected
            ]}>
              Turno {turno}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  return (
    <View style={globalStyles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.welcomeHeader}>
          <View style={styles.welcomeContent}>
            <MaterialIcons name="person" size={24} color={colors.primary} />
            <View>
              <Text style={styles.welcomeText}>Bem-vindo,</Text>
              <Text style={styles.userName}>{userName}</Text>
            </View>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.cleanupButton}
              onPress={handleDataCleanup}
            >
              <MaterialIcons name="delete-sweep" size={20} color={colors.warning} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <MaterialIcons name="logout" size={20} color={colors.white} />
              <Text style={styles.logoutText}>Sair</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.mainHeader}>
          <View style={styles.headerLeft}>
            <FontAwesome5 name="industry" size={24} color={colors.primary} />
            <Text style={styles.headerTitle}>Produção por Linha</Text>
          </View>
        </View>
      </View>

      <TurnoSelector />

      <FlatList
        key={'grid'}
        data={productionData}
        renderItem={renderItem}
        keyExtractor={item => item.linha}
        numColumns={2}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
      />

      <Modal
        visible={passwordModalVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Verificação de Segurança</Text>
            <Text style={styles.modalSubtitle}>Digite a senha para confirmar a exclusão:</Text>
            
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              placeholder="Digite a senha"
              secureTextEntry
              autoCapitalize="none"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setPasswordModalVisible(false);
                  setPassword('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handlePasswordSubmit}
              >
                <Text style={styles.confirmButtonText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: 35,
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  welcomeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  welcomeText: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 2,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  mainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    hitSlop: { top: 10, bottom: 10, left: 10, right: 10 },
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  logoutText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '500',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    padding: 10,
  },
  card: {
    flex: 1,
    margin: 8,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: '45%',
    position: 'relative',
  },
  linhaTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  dataRow: {
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  dataColumn: {
    alignItems: 'center',
    marginVertical: 5,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  icon: {
    marginBottom: 5,
  },
  turnoScrollView: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    height: 75,
    paddingVertical: 8,
  },
  turnoContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingBottom: 4,
    gap: 12,
  },
  turnoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: 6,
    height: 40,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  turnoButtonSelected: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  turnoText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  turnoTextSelected: {
    color: colors.white,
    fontWeight: 'bold',
  },
  emptyCard: {
    opacity: 0.7,
  },
  emptyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  emptyText: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: '500',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cleanupButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.warning,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 20,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmButton: {
    backgroundColor: colors.danger,
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  confirmButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '500',
  },
}); 