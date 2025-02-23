import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { globalStyles, colors } from '../styles/globalStyles';
import { MaterialIcons } from '@expo/vector-icons';

export default function ProductionDetailScreen({ route, navigation }) {
  const { linha, registros } = route.params;
  const [selectedRegistro, setSelectedRegistro] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);

  // Função para converter horário em minutos para comparação
  const timeToMinutes = (timeString, turno) => {
    if (!timeString) return 0;
    const [hours, minutes] = timeString.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    
    // Ajuste baseado no turno e seus horários específicos
    switch(turno) {
      case 'A': // 23:21 até 06:15
        if (hours >= 23 || hours < 6 || (hours === 6 && minutes <= 15)) {
          return hours >= 23 ? totalMinutes - (24 * 60) : totalMinutes;
        }
        return totalMinutes;
      
      case 'B': // 06:15 até 14:45
        if (hours >= 6 && (hours < 14 || (hours === 14 && minutes <= 45))) {
          return totalMinutes;
        }
        return totalMinutes + (24 * 60);
      
      case 'C': // 14:45 até 23:21
        if (hours >= 14 && hours < 23 || (hours === 14 && minutes >= 45) || (hours === 23 && minutes <= 21)) {
          return totalMinutes;
        }
        return totalMinutes + (24 * 60);

      case 'X': // 06:15 até 16:03
        if (hours >= 6 && hours < 16 || (hours === 6 && minutes >= 15) || (hours === 16 && minutes <= 3)) {
          return totalMinutes;
        }
        return totalMinutes + (24 * 60);

      case 'Y': // 16:03 até 01:23
        if (hours >= 16 || hours < 1 || (hours === 1 && minutes <= 23)) {
          return hours >= 16 ? totalMinutes : totalMinutes + (24 * 60);
        }
        return totalMinutes + (48 * 60);
      
      default:
        return totalMinutes;
    }
  };

  // Ordenar registros por horário e turno
  const sortedRegistros = [...registros].sort((a, b) => {
    const timeA = timeToMinutes(a.horaInicio, a.turno);
    const timeB = timeToMinutes(b.horaInicio, b.turno);
    return timeA - timeB;
  });

  const formatTime = (timeString) => {
    return timeString || '--:--';
  };

  const TableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.headerCell, { flex: 1.5 }]}>Horário</Text>
      <Text style={styles.headerCell}>Meta</Text>
      <Text style={styles.headerCell}>Prod.</Text>
      <Text style={styles.headerCell}>Acum.</Text>
      <Text style={[styles.headerCell, { flex: 0.8 }]}>Paradas</Text>
    </View>
  );

  const TableRow = ({ registro, index, acumulado }) => {
    const isExpanded = expandedRow === index;

    return (
      <View>
        <TouchableOpacity 
          style={[
            styles.tableRow,
            isExpanded && styles.tableRowExpanded
          ]}
          onPress={() => {
            if (registro.paradas?.length > 0) {
              setExpandedRow(isExpanded ? null : index);
            }
          }}
        >
          <Text style={[styles.cell, { flex: 1.5 }]}>
            {formatTime(registro.horaInicio)} - {formatTime(registro.horaFim)}
          </Text>
          <Text style={styles.cell}>{registro.meta}</Text>
          <Text style={[
            styles.cell, 
            registro.realProduzido >= registro.meta ? styles.successText : styles.warningText
          ]}>
            {registro.realProduzido}
          </Text>
          <Text style={[
            styles.cell,
            acumulado >= (registro.meta * (index + 1)) ? styles.successText : styles.warningText
          ]}>
            {acumulado}
          </Text>
          <View style={[styles.cell, { flex: 0.8, flexDirection: 'row', justifyContent: 'center' }]}>
            {registro.paradas?.length > 0 ? (
              <>
                <MaterialIcons 
                  name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                  size={18} 
                  color={colors.warning} 
                />
                <Text style={styles.paradasCount}>{registro.paradas.length}</Text>
              </>
            ) : (
              <MaterialIcons name="check-circle" size={18} color={colors.success} />
            )}
          </View>
        </TouchableOpacity>

        {isExpanded && registro.paradas?.length > 0 && (
          <View style={styles.expandedContent}>
            {registro.paradas.map((parada, paradaIndex) => (
              <View key={paradaIndex} style={styles.paradaItem}>
                <View style={styles.paradaHeader}>
                  <Text style={styles.paradaCodigo}>Código: {parada.codigo}</Text>
                  <Text style={styles.paradaTempo}>{parada.minutosPerdidos} min</Text>
                </View>
                <Text style={styles.paradaDescricao}>{parada.descricao}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const ParadasModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Paradas {formatTime(selectedRegistro?.horaInicio)} - {formatTime(selectedRegistro?.horaFim)}
            </Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.paradasList}>
            {selectedRegistro?.paradas.map((parada, index) => (
              <View key={index} style={styles.paradaItem}>
                <View style={styles.paradaHeader}>
                  <Text style={styles.paradaCodigo}>Código: {parada.codigo}</Text>
                  <Text style={styles.paradaTempo}>{parada.minutosPerdidos} min</Text>
                </View>
                <Text style={styles.paradaDescricao}>{parada.descricao}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Calcular acumulados
  const registrosComAcumulado = sortedRegistros.map((registro, index) => {
    const acumulado = sortedRegistros
      .slice(0, index + 1)
      .reduce((sum, reg) => sum + (Number(reg.realProduzido) || 0), 0);
    return { ...registro, acumulado };
  });

  // Calcular totais
  const totals = sortedRegistros.reduce((acc, registro) => {
    acc.totalMeta += Number(registro.meta) || 0;
    acc.totalProducao += Number(registro.realProduzido) || 0;
    acc.totalParadas += registro.paradas?.length || 0;
    return acc;
  }, { totalMeta: 0, totalProducao: 0, totalParadas: 0 });

  // Componente para linha de totais
  const TotalRow = () => (
    <View style={styles.totalRow}>
      <Text style={[styles.totalCell, { flex: 1.5 }]}>Total</Text>
      <Text style={styles.totalCell}>{totals.totalMeta}</Text>
      <Text style={[
        styles.totalCell, 
        totals.totalProducao >= totals.totalMeta ? styles.successText : styles.warningText
      ]}>
        {totals.totalProducao}
      </Text>
      <Text style={styles.totalCell}>{totals.totalProducao}</Text>
      <View style={[styles.totalCell, { flex: 0.8, flexDirection: 'row', justifyContent: 'center' }]}>
        {totals.totalParadas > 0 && (
          <>
            <MaterialIcons name="warning" size={18} color={colors.warning} />
            <Text style={styles.paradasCount}>{totals.totalParadas}</Text>
          </>
        )}
      </View>
    </View>
  );

  return (
    <View style={globalStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Linha {linha}</Text>
        <View style={styles.headerSpace} />
      </View>

      <ScrollView>
        <View style={styles.tableContainer}>
          <TableHeader />
          {registrosComAcumulado.map((registro, index) => (
            <TableRow 
              key={index} 
              registro={registro} 
              index={index} 
              acumulado={registro.acumulado}
            />
          ))}
          <TotalRow />
        </View>
      </ScrollView>

      <ParadasModal />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.white,
    paddingTop: 35,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  backButton: {
    padding: 12,
    marginLeft: 8,
  },
  headerSpace: {
    width: 48,
  },
  tableContainer: {
    margin: 10,
    backgroundColor: colors.white,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    padding: 12,
  },
  headerCell: {
    flex: 1,
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  cell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
  },
  successText: {
    color: colors.success,
    fontWeight: 'bold',
  },
  warningText: {
    color: colors.warning,
    fontWeight: 'bold',
  },
  paradasCount: {
    marginLeft: 4,
    color: colors.warning,
    fontWeight: 'bold',
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    padding: 5,
  },
  paradasList: {
    padding: 15,
  },
  paradaItem: {
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  paradaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  paradaCodigo: {
    fontWeight: 'bold',
    color: colors.text,
  },
  paradaTempo: {
    color: colors.danger,
    fontWeight: 'bold',
  },
  paradaDescricao: {
    color: colors.textLight,
  },
  tableRowExpanded: {
    backgroundColor: colors.background,
    borderBottomWidth: 0,
  },
  expandedContent: {
    backgroundColor: colors.background,
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  totalRow: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: colors.primary + '15', // Cor primária com 15% de opacidade
    borderTopWidth: 2,
    borderTopColor: colors.primary,
    alignItems: 'center',
  },
  totalCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
  },
}); 