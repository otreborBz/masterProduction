import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal, Platform, Alert, Dimensions } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { globalStyles, colors } from '../styles/globalStyles';
import { PieChart, BarChart, LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

const chartColors = {
  colors: [
    '#FF6B6B',  // Vermelho
    '#4ECDC4',  // Verde água
    '#45B7D1',  // Azul claro
    '#FFD93D',  // Amarelo
    '#6C5B7B',  // Roxo
    '#F18F01',  // Laranja
    '#2E86AB',  // Azul escuro
    '#95D47A',  // Verde claro
    '#FF9F89',  // Salmão
    '#7B6CF6'   // Roxo claro
  ]
};

export default function ProductionDetailScreen({ route, navigation }) {
  const { linha, registros } = route.params;
  const [selectedRegistro, setSelectedRegistro] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);

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

  // Função para formatar a data
  const formatDate = (date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Filtrar registros pela data selecionada
  const filteredRegistros = useMemo(() => {
    return registros.filter(registro => {
      const registroDate = new Date(registro.data);
      return registroDate.toDateString() === selectedDate.toDateString();
    });
  }, [registros, selectedDate]);

  // Ordenar registros filtrados por horário e turno
  const sortedRegistros = useMemo(() => {
    return [...filteredRegistros].sort((a, b) => {
      const timeA = timeToMinutes(a.horaInicio, a.turno);
      const timeB = timeToMinutes(b.horaInicio, b.turno);
      return timeA - timeB;
    });
  }, [filteredRegistros]);

  // Funções para o DatePicker
  const showDatePicker = () => {
    setDatePickerVisible(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisible(false);
  };

  const handleConfirm = (date) => {
    setSelectedDate(date);
    hideDatePicker();
  };

  const formatTime = (timeString) => {
    return timeString || '--:--';
  };

  const TableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.headerCell, { flex: 1.5 }]}>Horário</Text>
      <Text style={styles.headerCell}>Meta</Text>
      <Text style={styles.headerCell}>Prod.</Text>
      <Text style={[styles.headerCell, { flex: 0.8 }]}>Paradas</Text>
    </View>
  );

  const TableRow = ({ registro, index }) => {
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
            Number(registro.realProduzido) >= Number(registro.meta) ? styles.successText : styles.warningText
          ]}>
            {registro.realProduzido}
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
                {parada.observacao && (
                  <Text style={styles.paradaObservacao}>Obs: {parada.observacao}</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Calcular acumulados
  const registrosComAcumulado = sortedRegistros.map((registro, index) => {
    const acumulado = sortedRegistros
      .slice(0, index + 1)
      .reduce((sum, reg) => sum + (Number(reg.realProduzido) || 0), 0);
    return { ...registro, acumulado };
  });

  // Calcular totais
  const totals = sortedRegistros.reduce((acc, registro) => ({
    totalMeta: acc.totalMeta + Number(registro.meta),
    totalProducao: acc.totalProducao + Number(registro.realProduzido),
    totalParadas: acc.totalParadas + (registro.paradas?.length || 0)
  }), { totalMeta: 0, totalProducao: 0, totalParadas: 0 });

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

  // Componente do seletor de data
  const DateSelector = () => (
    <View style={styles.dateSelector}>
      <TouchableOpacity 
        style={styles.dateSelectorButton}
        onPress={showDatePicker}
      >
        <MaterialIcons name="calendar-today" size={24} color={colors.primary} />
        <Text style={styles.dateSelectorText}>{formatDate(selectedDate)}</Text>
        <MaterialIcons name="arrow-drop-down" size={24} color={colors.primary} />
      </TouchableOpacity>

      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleConfirm}
        onCancel={hideDatePicker}
        date={selectedDate}
        locale="pt-BR"
        cancelTextIOS="Cancelar"
        confirmTextIOS="Confirmar"
        headerTextIOS="Escolha uma data"
      />
    </View>
  );

  // Estatísticas calculadas
  const statistics = useMemo(() => {
    if (!sortedRegistros.length) return null;

    // Calcular total produzido e meta total
    const total = sortedRegistros.reduce((acc, reg) => acc + Number(reg.realProduzido), 0);
    const metaTotal = sortedRegistros.reduce((acc, reg) => acc + Number(reg.meta), 0);

    // Primeiro, vamos identificar todas as paradas programadas
    let tempoParadasProgramadas = 0;
    let tempoParadasNaoProgramadas = 0;

    // Calcular tempo de paradas separadamente
    sortedRegistros.forEach(registro => {
      if (registro.paradas) {
        registro.paradas.forEach(parada => {
          // Verificar se é parada programada pela categoria
          if (parada.categoria === "parada programada") {
            tempoParadasProgramadas += Number(parada.minutosPerdidos);
          } else {
            tempoParadasNaoProgramadas += Number(parada.minutosPerdidos);
          }
        });
      }
    });

    // Tempo total do turno em minutos
    const tempoTotal = sortedRegistros.length * 60;
    
    // Tempo disponível real (descontando paradas programadas)
    const tempoDisponivel = tempoTotal - tempoParadasProgramadas;
    
    // Ajustar a meta considerando o tempo disponível
    const metaAjustada = Math.round((metaTotal * tempoDisponivel) / tempoTotal);
    
    // Calcular eficiência real
    const eficiencia = (total / metaAjustada) * 100;

    console.log('Cálculo de Eficiência:', {
      total,
      metaTotal,
      metaAjustada,
      tempoTotal,
      tempoDisponivel,
      tempoParadasProgramadas,
      tempoParadasNaoProgramadas,
      eficiencia
    });

    return {
      total,
      metaOriginal: metaTotal,
      metaAjustada,
      eficiencia: eficiencia.toFixed(1),
      tempoTotal,
      tempoDisponivel,
      tempoParadasProgramadas,
      tempoParadasNaoProgramadas
    };
  }, [sortedRegistros]);

  // Dados para o gráfico de linha
  const lineChartData = {
    labels: sortedRegistros.map(reg => reg.horaInicio),
    datasets: [
      {
        data: sortedRegistros.map(reg => Number(reg.realProduzido)),
        color: () => colors.primary,
        strokeWidth: 2
      },
      {
        data: sortedRegistros.map(reg => Number(reg.meta)),
        color: () => colors.warning,
        strokeWidth: 2,
        dotted: true
      }
    ]
  };

  // Dados para o gráfico de pizza de paradas
  const pieChartData = statistics?.paradasPorTipo ? 
    Object.entries(statistics.paradasPorTipo).map(([codigo, data], index) => ({
      name: `${codigo} - ${data.descricao}`,
      minutos: data.minutos,
      color: colors.chartColors[index % colors.chartColors.length],
      legendFontColor: colors.text,
      legendFontSize: 12
    })) : [];

  // Componente de Cards Estatísticos
  const StatisticsCards = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statsCard}>
        <FontAwesome5 name="industry" size={24} color={colors.primary} />
        <Text style={styles.statsValue}>{statistics?.total || 0}</Text>
        <Text style={styles.statsLabel}>Produção Total</Text>
      </View>

      <View style={styles.statsCard}>
        <FontAwesome5 name="percentage" size={24} color={colors.success} />
        <Text style={styles.statsValue}>{statistics?.eficiencia}%</Text>
        <Text style={styles.statsLabel}>Eficiência Real</Text>
      </View>

      <View style={styles.statsCard}>
        <MaterialIcons name="warning" size={24} color={colors.warning} />
        <Text style={styles.statsValue}>{statistics?.tempoParadasNaoProgramadas}min</Text>
        <Text style={styles.statsLabel}>Tempo Total Paradas</Text>
      </View>
    </View>
  );

  const ParetoChart = ({ statistics, sortedRegistros }) => {
    const [selectedLevel, setSelectedLevel] = useState(1);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedSubcategory, setSelectedSubcategory] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    
    const paretoData = useMemo(() => {
      const data = sortedRegistros.reduce((acc, registro) => {
        registro.paradas?.forEach(parada => {
          let key;
          if (selectedLevel === 1) {
            key = parada.categoria.split(' ')[0];
          } else if (selectedLevel === 2 && parada.categoria.startsWith(selectedCategory)) {
            key = `${parada.codigo} - ${parada.descricao}`;
          } else if (selectedLevel === 3 && 
                    parada.categoria.startsWith(selectedCategory) && 
                    `${parada.codigo} - ${parada.descricao}` === selectedSubcategory) {
            key = parada.observacao || "Sem observação";
          } else {
            return;
          }

          if (!acc[key]) {
            acc[key] = {
              minutes: 0,
              count: 0
            };
          }
          acc[key].minutes += Number(parada.minutosPerdidos);
          acc[key].count++;
        });
        return acc;
      }, {});

      const sortedData = Object.entries(data)
        .map(([name, values]) => ({
          name,
          minutes: values.minutes,
          count: values.count
        }))
        .sort((a, b) => b.minutes - a.minutes);

      const total = sortedData.reduce((sum, item) => sum + item.minutes, 0);
      let accumulated = 0;

      return sortedData.map(item => {
        accumulated += item.minutes;
        return {
          ...item,
          percentage: (item.minutes / total) * 100,
          accumulated: (accumulated / total) * 100
        };
      });
    }, [sortedRegistros, selectedLevel, selectedCategory, selectedSubcategory]);

    const getBreadcrumb = () => {
      const items = ['Categorias'];
      if (selectedCategory) items.push(selectedCategory);
      if (selectedSubcategory) items.push(selectedSubcategory.split(' - ')[1]);
      return items;
    };

    const chartData = {
      labels: paretoData.map(item => item.name),
      datasets: [
        {
          data: paretoData.map(item => item.minutes),
          colors: paretoData.map((_, index) => {
            // Retorna uma função que retorna a cor específica para cada barra
            return () => chartColors.colors[index % chartColors.colors.length];
          })
        },
        {
          data: paretoData.map(item => item.accumulated),
          color: () => chartColors.colors[0],
          strokeWidth: 2
        }
      ],
      legend: ['Tempo (min)', 'Acumulado (%)']
    };

    return (
      <View style={styles.paretoContainer}>
        <View style={styles.navigationHeader}>
          {selectedLevel > 1 && (
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => {
                if (selectedLevel === 3) {
                  setSelectedLevel(2);
                  setSelectedSubcategory(null);
                } else if (selectedLevel === 2) {
                  setSelectedLevel(1);
                  setSelectedCategory(null);
                }
              }}
            >
              <MaterialIcons name="arrow-back" size={20} color={colors.text} />
            </TouchableOpacity>
          )}
          <Text style={styles.currentLevel}>
            {selectedLevel === 1 ? 'Análise de Paradas' : 
             selectedLevel === 2 ? selectedCategory :
             selectedSubcategory?.split(' - ')[1]}
          </Text>
        </View>

        <View style={styles.chartContainer}>
          <BarChart
            data={{
              labels: paretoData.map(item => item.name),
              datasets: [{
                data: paretoData.map(item => item.minutes),
                colors: paretoData.map((_, index) => () => chartColors.colors[index % chartColors.colors.length])
              }]
            }}
            width={screenWidth - 60}
            height={220}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              barPercentage: 0.7,
              propsForVerticalLabels: {
                rotation: 45,
                fontSize: 10,
                width: 200,
              }
            }}
            style={{
              borderRadius: 8,
              paddingRight: 0,
              paddingLeft: 0,
              paddingBottom: 0,
            }}
            showValuesOnTopOfBars={true}
            withInnerLines={false}
            fromZero={true}
            yAxisLabel=""
            yAxisSuffix="min"
          />
        </View>

        {showDetails && (
          <ScrollView 
            style={styles.detailList}
            horizontal={false}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.detailTable}>
              {paretoData.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.detailItem}
                  onPress={() => {
                    if (selectedLevel === 1) {
                      setSelectedCategory(item.name);
                      setSelectedLevel(2);
                    } else if (selectedLevel === 2) {
                      setSelectedSubcategory(item.name);
                      setSelectedLevel(3);
                    }
                  }}
                >
                  <View style={styles.detailContent}>
                    <View style={styles.detailNameContainer}>
                      <Text style={styles.detailName} numberOfLines={2}>
                        {item.name}
                      </Text>
                    </View>
                    <View style={styles.detailValues}>
                      <Text style={styles.detailMinutes}>{item.minutes}min</Text>
                      <Text style={styles.detailPercentage}>{item.percentage.toFixed(1)}%</Text>
                    </View>
                  </View>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill,
                        { 
                          width: `${item.percentage}%`,
                          backgroundColor: chartColors.colors[index % chartColors.colors.length]
                        }
                      ]} 
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        <TouchableOpacity 
          style={styles.toggleButton}
          onPress={() => setShowDetails(!showDetails)}
        >
          <MaterialIcons 
            name={showDetails ? "expand-less" : "expand-more"} 
            size={24} 
            color={colors.text} 
          />
        </TouchableOpacity>
      </View>
    );
  };

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

      <DateSelector />

      <ScrollView>
        {statistics && (
          <>
            <StatisticsCards />
            <ParetoChart 
              statistics={statistics} 
              sortedRegistros={sortedRegistros} 
            />
          </>
        )}

        <View style={styles.tableContainer}>
          <TableHeader />
          {sortedRegistros.length > 0 ? (
            <>
              {sortedRegistros.map((registro, index) => (
                <TableRow 
                  key={index} 
                  registro={registro} 
                  index={index}
                />
              ))}
              <TotalRow />
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Nenhum registro encontrado para esta data</Text>
            </View>
          )}
        </View>
      </ScrollView>
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
    marginTop: 16,
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
  dateSelector: {
    padding: 15,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dateSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    gap: 10,
    justifyContent: 'center', // Centraliza os elementos
  },
  dateSelectorText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
    marginHorizontal: 10,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textLight,
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  statsCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginVertical: 8,
  },
  statsLabel: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
  },
  expandedContent: {
    backgroundColor: colors.background,
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  paradaObservacao: {
    color: colors.textLight,
    fontSize: 13,
    marginTop: 4,
    fontStyle: 'italic'
  },
  graphicsContainer: {
    padding: 16,
  },
  graphicCard: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  graphicTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    flex: 1,
    paddingRight: 8,
  },
  paretoContainer: {
    backgroundColor: colors.white,
    margin: 16,
    borderRadius: 8,
    padding: 16,
  },
  navigationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  currentLevel: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  chartContainer: {
    marginBottom: 16,
  },
  detailList: {
    marginTop: 16,
    maxHeight: 300, // Altura máxima para a lista
  },
  detailTable: {
    width: '100%',
  },
  detailItem: {
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  detailContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailNameContainer: {
    flex: 1,
    marginRight: 16,
  },
  detailName: {
    fontSize: 14,
    color: colors.text,
    flexWrap: 'wrap',
  },
  detailValues: {
    alignItems: 'flex-end',
    minWidth: 80, // Largura mínima para os valores
  },
  detailMinutes: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  detailPercentage: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  toggleButton: {
    alignItems: 'center',
    padding: 8,
    marginTop: 8,
  },
}); 